// public/js/zip.js - Lightweight Pure JS ZIP Archive Builder (PKZip Specification)

class MiniZip {
  constructor() {
    this.files = [];
  }

  // Add text or binary content
  addFile(filename, content) {
    let data;
    if (typeof content === 'string') {
      data = new TextEncoder().encode(content);
    } else if (content instanceof Uint8Array) {
      data = content;
    } else if (content instanceof ArrayBuffer) {
      data = new Uint8Array(content);
    } else {
      throw new Error('Unsupported file content type');
    }

    this.files.push({
      name: filename,
      data: data,
      crc: this.crc32(data),
      date: new Date()
    });
  }

  // Simple CRC32 implementation
  crc32(data) {
    let crc = 0 ^ (-1);
    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ MiniZip.CRC_TABLE[(crc ^ data[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }

  // Build the complete ZIP buffer
  generateBlob() {
    const fileRecords = [];
    const centralDirectoryRecords = [];
    let offset = 0;

    for (const file of this.files) {
      const nameBytes = new TextEncoder().encode(file.name);
      const modTime = ((file.date.getHours() << 11) | (file.date.getMinutes() << 5) | (file.date.getSeconds() >> 1)) & 0xFFFF;
      const modDate = (((file.date.getFullYear() - 1980) << 9) | ((file.date.getMonth() + 1) << 5) | file.date.getDate()) & 0xFFFF;

      // Local file header (30 bytes + name length)
      const localHeader = new Uint8Array(30 + nameBytes.length);
      const lv = new DataView(localHeader.buffer);
      lv.setUint32(0, 0x04034b50, true); // Local header signature
      lv.setUint16(4, 20, true);         // Version needed
      lv.setUint16(6, 0, true);          // General purpose bit flag
      lv.setUint16(8, 0, true);          // Compression method (0 = uncompressed store)
      lv.setUint16(10, modTime, true);
      lv.setUint16(12, modDate, true);
      lv.setUint32(14, file.crc, true);  // CRC-32
      lv.setUint32(18, file.data.length, true); // Compressed size
      lv.setUint32(22, file.data.length, true); // Uncompressed size
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true);         // Extra field length
      localHeader.set(nameBytes, 30);

      fileRecords.push(localHeader, file.data);

      // Central directory header (46 bytes + name length)
      const cdHeader = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(cdHeader.buffer);
      cv.setUint32(0, 0x02014b50, true); // Central directory signature
      cv.setUint16(4, 20, true);         // Version made by
      cv.setUint16(6, 20, true);         // Version needed
      cv.setUint16(8, 0, true);          // General purpose bit
      cv.setUint16(10, 0, true);         // Compression method
      cv.setUint16(12, modTime, true);
      cv.setUint16(14, modDate, true);
      cv.setUint32(16, file.crc, true);
      cv.setUint32(20, file.data.length, true);
      cv.setUint32(24, file.data.length, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true);         // Extra field length
      cv.setUint16(32, 0, true);         // Comment length
      cv.setUint16(34, 0, true);         // Disk number start
      cv.setUint16(36, 0, true);         // Internal file attrs
      cv.setUint32(38, 0, true);         // External file attrs
      cv.setUint32(42, offset, true);    // Local header offset
      cdHeader.set(nameBytes, 46);

      centralDirectoryRecords.push(cdHeader);
      offset += localHeader.length + file.data.length;
    }

    const cdOffset = offset;
    let cdSize = 0;
    for (const cd of centralDirectoryRecords) cdSize += cd.length;

    // End of central directory record (22 bytes)
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true); // EOCD signature
    ev.setUint16(4, 0, true);          // Disk number
    ev.setUint16(6, 0, true);          // Disk with CD
    ev.setUint16(8, this.files.length, true);  // Entries on disk
    ev.setUint16(10, this.files.length, true); // Total entries
    ev.setUint32(12, cdSize, true);    // Size of central directory
    ev.setUint32(16, cdOffset, true);  // Offset of CD
    ev.setUint16(20, 0, true);         // Comment length

    const parts = [...fileRecords, ...centralDirectoryRecords, eocd];
    return new Blob(parts, { type: 'application/zip' });
  }

  // Trigger browser download
  download(filename = 'opusflow_clips.zip') {
    const blob = this.generateBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  }
}

// Pre-compute CRC table
MiniZip.CRC_TABLE = (function() {
  let c;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

window.MiniZip = MiniZip;
