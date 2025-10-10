import type { Route } from "./+types/home";
import Webcam from "react-webcam";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Recurse Photobooth" },
    { name: "description", content: "Recurse Photobooth" },
  ];
}

export function WebcamDisplay() {
  const videoConstraints = {
    facingMode: "user",
  };
  const styleConstraints = {
    filter: "grayscale(100%)",
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-6">Recurse Display</h1>
        <Webcam
          audio={false}
          videoConstraints={videoConstraints}
          style={styleConstraints}
          screenshotFormat="image/jpeg"
          className="rounded-lg shadow-2xl max-w-2xl w-full"
        />
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
