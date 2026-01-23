// lib/xhrUpload.ts
export function xhrUpload(
    url: string,
    form: FormData,
    onProgress?: (percent: number) => void,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
  
      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable || !onProgress) return;
        const percent = Math.round((e.loaded / e.total) * 90);
        onProgress(percent);
      };
  
      xhr.onload = () => {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Invalid server response"));
        }
      };
  
      xhr.onerror = () => reject(new Error("Upload failed"));
  
      xhr.send(form);
    });
  }
  