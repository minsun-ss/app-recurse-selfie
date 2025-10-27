// @ts-expect-error no declaration file
import ReceiptPrinterEncoder from "@point-of-sale/receipt-printer-encoder";
import { OLD_PRINTER_ENDPOINT, NEW_PRINTER_ENDPOINT } from "../constants";

/**
 * Sends a request to the receipt printer on the external network. Returns results of
 * the return back.
 *
 * @param url receipt printer URL, already encoded in ESC/POS bytes
 * @param photoData processed data to send
 */
export async function sendReceiptExternalPrinter(
  photoData: Uint8Array,
  photoToken: string,
): Promise<number> {
  try {
    // timeout checks are required against CORS errors
    const controller = new AbortController();
    const timeoutID = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(NEW_PRINTER_ENDPOINT, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-CSRF-Token": photoToken,
      },
      body: photoData as BodyInit,
      signal: controller.signal,
    });

    clearTimeout(timeoutID);

    if (!response.ok) {
      console.error(`HTTP error, status: ${response.status}`);
    } else {
      const contentType = response.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        const resp = await response.json();
        console.log("JSON response: ", resp);
      } else {
        const text = await response.text();
        console.log("Non-JSON response: ", text);
      }
    }
    return response.status;
  } catch (error) {
    console.error("Network or CORS failure:", error);
    return 0;
  }
}

/**
 * Allows a test print endpoint that does not require the use of cookies; can only
 * be tested while at the Hub. Conversion to ESC/POS format is embedded here.
 *
 * @param photoData canvas string
 */
export async function sendReceiptInternalPrinter(photoData: string) {
  const photoImg = new Image();
  const blob = await fetch(photoData).then((r) => r.blob());
  const imgUrl = URL.createObjectURL(blob);

  await new Promise((resolve) => {
    photoImg.onload = resolve;
    photoImg.src = imgUrl;
  });

  const result = new ReceiptPrinterEncoder({
    printerModel: "epson-tm-t88v",
    imageMode: "raster", // this is required for pretty images
  })
    .initialize()
    .align("center")
    .image(photoImg, photoImg.width, photoImg.height, "atkinson")
    .line("")
    .cut("full")
    .encode();

  const b64_version = btoa(String.fromCharCode(...result));
  console.log(b64_version);
  const response = await fetch(OLD_PRINTER_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ buffer: b64_version }),
  });
  const resp = await response.json();
  console.log("testPrint", resp);
}
