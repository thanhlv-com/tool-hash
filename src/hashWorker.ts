import CryptoJS from 'crypto-js';
import { blake2b, blake2s } from '@noble/hashes/blake2.js';
import { blake3 } from '@noble/hashes/blake3.js';
import { ripemd160 } from '@noble/hashes/legacy.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { streebog256, streebog512 } from '@li0ard/streebog';
import sm3 from 'sm-crypto/src/sm3/index.js';

type EncodingType = 'Hex (Base 16)' | 'Base64' | 'Base 91' | 'Base 85' | 'Base 62' | 'Base 58' | 'Base 8' | 'Base 2';

const encodeBase = (hex: string, alphabet: string): string => {
  if (!hex) return '';
  let leadingZeroBytes = 0;
  for (let i = 0; i < hex.length; i += 2) {
    if (hex.substring(i, i + 2) === '00') leadingZeroBytes++;
    else break;
  }
  let val = BigInt('0x' + (hex || '0'));
  if (val === 0n) return alphabet[0].repeat(leadingZeroBytes) || alphabet[0];
  const base = BigInt(alphabet.length);
  let result = '';
  while (val > 0n) {
    const remainder = Number(val % base);
    result = alphabet[remainder] + result;
    val = val / base;
  }
  return alphabet[0].repeat(leadingZeroBytes) + result;
};

const encodeHash = (hex: string, encoding: EncodingType): string => {
  if (encoding === 'Hex (Base 16)') return hex;
  const wordArray = CryptoJS.enc.Hex.parse(hex);
  if (encoding === 'Base64') return CryptoJS.enc.Base64.stringify(wordArray);
  if (encoding === 'Base 2') {
    const val = BigInt('0x' + (hex || '0'));
    return val.toString(2).padStart(wordArray.sigBytes * 8, '0');
  }
  if (encoding === 'Base 8') {
    const val = BigInt('0x' + (hex || '0'));
    return val.toString(8).padStart(Math.ceil(wordArray.sigBytes * 8 / 3), '0');
  }
  if (encoding === 'Base 58') {
    return encodeBase(hex, '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');
  }
  if (encoding === 'Base 62') {
    return encodeBase(hex, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');
  }
  if (encoding === 'Base 91') {
    return encodeBase(hex, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,./:;<=>?@[]^_`{|}~"');
  }
  if (encoding === 'Base 85') {
    return encodeBase(hex, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#');
  }
  return '';
};

function arrayBufferToWordArray(arrayBuffer: ArrayBuffer) {
  const words: number[] = [];
  const u8 = new Uint8Array(arrayBuffer);
  for (let i = 0; i < u8.length; i++) {
    words[i >>> 2] |= (u8[i] & 0xff) << (24 - (i % 4) * 8);
  }
  return CryptoJS.lib.WordArray.create(words, u8.length);
}

const ALGORITHMS: Record<string, (text?: string, buffer?: ArrayBuffer, uint8Array?: Uint8Array) => string> = {
  'MD5': (t, b, u) => t !== undefined ? CryptoJS.MD5(t).toString(CryptoJS.enc.Hex) : CryptoJS.MD5(arrayBufferToWordArray(b!)).toString(CryptoJS.enc.Hex),
  'SHA-1': (t, b, u) => t !== undefined ? CryptoJS.SHA1(t).toString(CryptoJS.enc.Hex) : CryptoJS.SHA1(arrayBufferToWordArray(b!)).toString(CryptoJS.enc.Hex),
  'SHA-256': (t, b, u) => t !== undefined ? CryptoJS.SHA256(t).toString(CryptoJS.enc.Hex) : CryptoJS.SHA256(arrayBufferToWordArray(b!)).toString(CryptoJS.enc.Hex),
  'SHA-512': (t, b, u) => t !== undefined ? CryptoJS.SHA512(t).toString(CryptoJS.enc.Hex) : CryptoJS.SHA512(arrayBufferToWordArray(b!)).toString(CryptoJS.enc.Hex),
  'SHA-3': (t, b, u) => t !== undefined ? CryptoJS.SHA3(t).toString(CryptoJS.enc.Hex) : CryptoJS.SHA3(arrayBufferToWordArray(b!)).toString(CryptoJS.enc.Hex),
  'SM3': (t, b, u) => t !== undefined ? sm3(t) : sm3(Array.from(u!)),
  'GOST 256': (t, b, u) => bytesToHex(streebog256(t !== undefined ? new TextEncoder().encode(t) : u!)),
  'GOST 512': (t, b, u) => bytesToHex(streebog512(t !== undefined ? new TextEncoder().encode(t) : u!)),
  'RIPEMD-160': (t, b, u) => bytesToHex(ripemd160(t !== undefined ? new TextEncoder().encode(t) : u!)),
  'BLAKE2b': (t, b, u) => bytesToHex(blake2b(t !== undefined ? new TextEncoder().encode(t) : u!)),
  'BLAKE2s': (t, b, u) => bytesToHex(blake2s(t !== undefined ? new TextEncoder().encode(t) : u!)),
  'BLAKE3': (t, b, u) => bytesToHex(blake3(t !== undefined ? new TextEncoder().encode(t) : u!)),
};

self.addEventListener('message', async (e) => {
  const { jobId, text, buffer, selectedAlgos, selectedEncoding } = e.data;
  
  const uint8Array = buffer ? new Uint8Array(buffer) : undefined;

  for (const algoId of selectedAlgos) {
    try {
      if (ALGORITHMS[algoId]) {
        self.postMessage({ jobId, algoId, status: 'computing' });
        // Force a layout/yield so main thread can paint the "computing" status
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const hex = ALGORITHMS[algoId](text, buffer, uint8Array);
        const encoded = encodeHash(hex, selectedEncoding);
        
        self.postMessage({ jobId, algoId, result: encoded, status: 'done' });
      }
    } catch (err: any) {
      self.postMessage({ jobId, algoId, error: err.message, status: 'error' });
    }
  }
  self.postMessage({ jobId, done: true });
});
