import React, { useRef, useState, useCallback } from "react";
import type { Route } from "./+types/home";
import Webcam from "react-webcam";
import { convertImage, encodeImage } from "~/processing/image";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Recurse Photobooth" },
    { name: "description", content: "Recurse Photobooth" },
    { tagName: "link", rel: "icon", href: "/favicon.ico" },
  ];
}

export function WebcamDisplay() {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [inputText, setInputText] = useState(null);

  const videoConstraints = {
    facingMode: "user",
    width: { min: 300, ideal: 640 },
    height: { min: 225, ideal: 480 },
  };
  const styleConstraints = {
    filter: "grayscale(100%)",
    objectFit: "cover",
  };
  const webcamRef = useRef(null);
  const capture = useCallback(async () => {
    setCountdown(3);

    for (let i = 2; i >= 0; i--) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setCountdown(i);
    }

    const imgSrc = webcamRef.current?.getScreenshot();
    if (imgSrc) {
      const resized = await convertImage(imgSrc, 496);
      encodeImage(resized, inputText);
      setImgSrc(resized);
    }

    // clear on end
    setCountdown(null);
    setInputText(null);
  }, [webcamRef, inputText]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="text-center">
        <div className="relative w-full aspect-[4/5]">
          <Webcam
            ref={webcamRef}
            audio={false}
            videoConstraints={videoConstraints}
            style={styleConstraints}
            screenshotFormat="image/png"
            className="rounded-lg shadow-2xl w-[84.375%] mx-auto pt-[50px]"
          />

          <div>
            <textarea
              value={inputText || ""}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Optional Text"
              className="border p-4 w-[80%] mt-4"
            />
          </div>

          <button
            type="button"
            onClick={capture}
            disabled={countdown != null}
            className="mt-4 bg-red-600 border-2 border-white rounded-full px-6 py-3 text-xl font-bold text-3xl font-bold text-white mb-6 hover:bg-red-500 active:scale-95 transition-transform"
          >
            {countdown !== null
              ? `Ready in ${countdown}...`
              : "Take a picture!"}
          </button>
        </div>
        {imgSrc && (
          <div className="mt-6">
            <img src={imgSrc} alt="Captured" className="mx-auto" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div>
      <WebcamDisplay />
    </div>
  );
}
