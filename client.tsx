// timeout 5 second
import screenshotDesktop from "screenshot-desktop";

setInterval(async () => {
  const img = await screenshotDesktop()
  const base64data = img.toString("base64");
  console.log("Screenshot taken")

  await fetch("http://localhost:5173/api/employee/screenshot", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ img: base64data }),
  })
    .then((res) => res.json())
    .then((data) => console.log(data))
    .catch((err) => console.log(err));
}, 5000);
