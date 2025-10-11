/**
 * Resizes the image to something appropriate for the Recurse
 * receipt printer (512 px wide).
 *
 * @param data
 * @param targetWidth
 * @returns
 */
export function convertImage(
  data: string,
  targetWidth: number,
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const scale = targetWidth / img.width;
      const width = targetWidth;
      const height = img.height * scale;

      canvas.width = width;
      canvas.height = height;
      ctx.filter = "grayscale(100%)";
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL("image/jpeg"));
    };
    img.src = data;
  });
}
