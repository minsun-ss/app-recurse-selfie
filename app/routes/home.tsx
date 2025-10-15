import React, { useRef, useState, useCallback } from "react";
import type { Route } from "./+types/home";
import Webcam from "react-webcam";
import { convertImage, renderPhotoAndPrint } from "~/processing/image";
import { COMPUTER_IMAGE_MAX_WIDTH } from "~/processing/constants";

// eslint-disable-next-line no-empty-pattern
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Recurse Photobooth" },
    { name: "description", content: "Recurse Photobooth" },
    { tagName: "link", rel: "icon", href: "/favicon.ico" },
  ];
}

/**
 *
 * @returns
 */
export function WebcamDisplay() {
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
      renderPhotoAndPrint(resized, inputText);
      setImgSrc(resized);
    }

    // clear on end
    setCountdown(null);
    setInputText(null);
  }, [webcamRef, inputText]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="flex flex-wrap items-center justify-center text-center gap-8">
        <div className="relative w-full max-w-md aspect-[3/5]">
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
              className="border bg-white text-black placeholder-gray-400 p-4 w-[80%] mt-4"
            />
          </div>

          <button
            type="button"
            onClick={capture}
            disabled={countdown != null}
            className="mt-4 bg-red-600 border-2 border-white rounded-full px-6 py-3 text-xl font-bold text-white mb-6 hover:bg-red-500 active:scale-95 transition-transform"
          >
            {countdown !== null
              ? `Ready in ${countdown}...`
              : "Take a picture!"}
          </button>
        </div>
      </div>
    </div>
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
