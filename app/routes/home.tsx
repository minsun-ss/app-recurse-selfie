import React, { useRef, useState, useCallback } from "react";
import type { Route } from "./+types/home";
import Webcam from "react-webcam";
import { convertImage, renderPhotoAndPrint } from "~/processing/image";
import { COMPUTER_IMAGE_MAX_WIDTH } from "~/constants";
import { parse } from "cookie";
import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";

// eslint-disable-next-line no-empty-pattern
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Recurse Photobooth" },
    { name: "description", content: "Recurse Photobooth" },
    { tagName: "link", rel: "icon", href: "/favicon.ico" },
  ];
}


//     you have to be deployed on a *.recurse.com subdomain, check for a cookie with key ‘receipt_csrf’, and include it as an http header ‘X-CSRF-Token’ in your post request to https://receipt.recurse.com/escpos

// if there's no cookie with key receipt_csrf you need to prompt the user (with a link) to authenticate with receipt printer API, you can just link to https://receipt.recurse.com/login
export async function loader({ request }: LoaderFunctionArgs) {
  const cookieHeader = request.headers.get("Cookie");
  const cookies = cookieHeader ? parse(cookieHeader) : {};

  const printerToken = cookies.receipt_csrf;

  if (process.env.NODE_ENV === "development") {
    return {
      isAuthenticated: true,
      printerToken: "dev-token",
    };
  }

  return {
    isAuthenticated: !!printerToken,
    printerToken: printerToken,
  };
}

/**
 *
 * @returns
 */
export function WebcamDisplay() {
  const { isAuthenticated, printerToken } = useLoaderData();

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <p>Please authenticate with the Recurse Center for access: </p>
        <p>
          <a href="https://receipt.recurse.com/login">Login to Recurse</a>
        </p>
      </div>
    );
  }

  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [inputText, setInputText] = useState<string | null>(null);

  // set up video and style constraints
  const videoConstraints = {
    facingMode: "user",
  };
  const styleConstraints: React.CSSProperties = {
    filter: "grayscale(100%)",
    objectFit: "cover",
    // width: "320px",
  };

  const webcamRef = useRef<Webcam>(null);
  const capture = useCallback(async () => {
    setCountdown(3);

    for (let i = 2; i >= 0; i--) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setCountdown(i);
    }

    setImgSrc(webcamRef.current?.getScreenshot() ?? null);
    if (imgSrc) {
      const resized = await convertImage(imgSrc, COMPUTER_IMAGE_MAX_WIDTH);
      renderPhotoAndPrint(resized, inputText, printerToken);
      setImgSrc(resized);
    }

    // clear on end
    setCountdown(null);
    setInputText(null);
  }, [webcamRef, inputText]);

  return (
    <>
      <div className="flex items-center justify-center h-[calc(100vh-3rem)] bg-white">
        <div className="flex flex-col lg:flex-row items-center justify-center text-center gap-8">
          <div className="relative w-full max-w-md flex flex-col items-center">
            <Webcam
              ref={webcamRef}
              audio={false}
              videoConstraints={videoConstraints}
              style={styleConstraints}
              screenshotFormat="image/png"
              className="rounded-lg shadow-2xl "
            />

            <div>
              <textarea
                value={inputText || ""}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Optional Text"
                className="border bg-white text-black placeholder-gray-400 p-4 mt-4"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={capture}
            disabled={countdown != null}
            className="mt-2 bg-red-600 border-2 border-white rounded-full px-6 py-3 text-xl font-bold text-white hover:bg-red-500 active:scale-95 transition-transform"
          >
            {countdown !== null
              ? `Ready in ${countdown}...`
              : "Take a picture!"}
          </button>
        </div>
      </div>
      <div className="pl-4 text-black">
        <p>A Recurse project.</p>

        <a
          className="text-blue-600 underline hover:text-blue-800"
          href="https://github.com/minsun-ss/app-recurse-selfie"
        >
          Contribute here!
        </a>
      </div>
    </>
  );
}

// TODO:; set up preview
// {imgSrc && (
//   <div className="mt-6">
//     <img src={imgSrc} alt="Captured" className="mx-auto" />
//   </div>
// )}

export default function Home() {
  return (
    <div>
      <WebcamDisplay />
    </div>
  );
}
