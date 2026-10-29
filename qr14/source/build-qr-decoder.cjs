/* Reproducible jsQR 1.4.0 extension: QR Hanzi subset 1 and strict mode handling. */
const fs=require('fs'),path=require('path'),p=__dirname;
let s=fs.readFileSync(path.join(p,'vendor/jsQR-original.js'),'utf8');
const marker='function decode(data, version) {';
if(!s.includes(marker))throw Error('Unexpected jsQR decoder source');
const addition=`// Local extension: QR Hanzi subset 1 (GB2312), preserving raw bytes.
function decodeHanzi(stream, size) {
    if (stream.readBits(4) !== 1) throw new Error('Unsupported Hanzi subset');
    var length = stream.readBits([8, 10, 12][size]), bytes = [];
    for (var i = 0; i < length; i++) {
        var value = stream.readBits(13);
        var assembled = (Math.floor(value / 0x60) << 8) | (value % 0x60);
        assembled += assembled < 0x0A00 ? 0xA1A1 : 0xA6A1;
        bytes.push(assembled >> 8, assembled & 255);
    }
    var text = new TextDecoder('gb18030', {fatal:true, ignoreBOM:true}).decode(new Uint8Array(bytes));
    return {bytes:bytes, text:text};
}
`;
s=s.replace(marker,addition+marker);
const kanji='        else if (mode === ModeByte.Kanji) {';
const branch=`        else if (mode === 13) {
            var hanziResult = decodeHanzi(stream, size);
            result.text += hanziResult.text;
            result.bytes.push.apply(result.bytes, hanziResult.bytes);
            result.chunks.push({type:'hanzi', bytes:hanziResult.bytes, text:hanziResult.text});
        }
`;
if(!s.includes(kanji))throw Error('Missing jsQR mode handler');s=s.replace(kanji,branch+kanji);
const tail='    // If there is no data left, or the remaining bits are all 0, then that counts as a termination marker';
let i=s.indexOf(tail),before=s.slice(0,i),needle='        }\n    }\n';let j=before.lastIndexOf(needle);if(j<0)throw Error('Missing decoder loop tail');
s=before.slice(0,j)+before.slice(j).replace(needle,"        }\n        else { throw new Error('Unsupported QR segment mode'); }\n    }\n")+s.slice(i);
fs.writeFileSync(path.join(p,'vendor/jsQR.js'),'/* jsQR 1.4.0, Apache-2.0. Local extension: Hanzi and strict unsupported-mode rejection. */\n'+s);
console.log('Built local QR decoder');
