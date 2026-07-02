const CLOUD_NAME = 'diwgfhoux';
const UPLOAD_PRESET = 'medianova';

export const uploadToCloudinary = async (
  fileUri: string,
  fileType: 'image' | 'video' | 'audio',
  onProgress?: (progress: number) => void
): Promise<string> => {
  const formData = new FormData();
  const extension = fileType === 'video' ? 'mp4' : fileType === 'audio' ? 'm4a' : 'jpg';
  const mimeType = fileType === 'video' ? 'video/mp4' : fileType === 'audio' ? 'audio/m4a' : 'image/jpeg';

  formData.append('file', {
    uri: fileUri,
    type: mimeType,
    name: `upload.${extension}`,
  } as any);

  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('resource_type', fileType === 'audio' ? 'video' : fileType);

  const resourceType = fileType === 'audio' ? 'video' : fileType;
  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        resolve(response.secure_url);
      } else {
        reject(new Error('Upload gagal: ' + xhr.status));
      }
    };

    xhr.onerror = () => reject(new Error('Network error saat upload'));
    xhr.open('POST', uploadUrl);
    xhr.send(formData);
  });
};