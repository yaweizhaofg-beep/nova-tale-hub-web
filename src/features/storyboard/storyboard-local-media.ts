export const imageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
export const audioTypes = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/ogg'];
export const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];

export function readLocalMedia(file: File, types: string[], limitKb: number) {
  if (!types.includes(file.type) || !file.size || file.size > limitKb * 1024) {
    throw new Error('请选择支持的格式，文件大小不超过 ' + limitKb + ' KB。');
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('读取文件失败。'));
    reader.readAsDataURL(file);
  });
}

export function verifyPlayableMedia(url: string, kind: 'audio' | 'video') {
  return new Promise<void>((resolve, reject) => {
    const media = document.createElement(kind);
    const timeout = window.setTimeout(fail, 4000);
    function cleanup() {
      window.clearTimeout(timeout);
      media.onloadedmetadata = null;
      media.onerror = null;
      media.removeAttribute('src');
      media.load();
    }
    function fail() {
      cleanup();
      reject(new Error('浏览器无法播放此文件，请检查格式或重新编码。'));
    }
    media.onloadedmetadata = () => {
      cleanup();
      resolve();
    };
    media.onerror = fail;
    media.preload = 'metadata';
    media.src = url;
  });
}
