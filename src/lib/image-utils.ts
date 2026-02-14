/**
 * Resize and crop an image file to standard dimensions, return as base64 data URI.
 * Center-crops to fill target aspect ratio (16:9), outputs JPEG.
 */
export function resizeImage(
  file: File,
  maxWidth = 400,
  maxHeight = 225
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      img.src = reader.result as string;
    };

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = maxWidth;
      canvas.height = maxHeight;
      const ctx = canvas.getContext("2d")!;

      // Center-crop to fill the target aspect ratio
      const srcAspect = img.width / img.height;
      const dstAspect = maxWidth / maxHeight;
      let sx = 0,
        sy = 0,
        sw = img.width,
        sh = img.height;

      if (srcAspect > dstAspect) {
        sw = img.height * dstAspect;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / dstAspect;
        sy = (img.height - sh) / 2;
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, maxWidth, maxHeight);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
