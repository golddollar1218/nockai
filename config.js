// Public site settings. Fill these in before launch. Leave a value empty to hide or disable that feature.
window.NOCKAI_CONFIG = {
  huggingFaceUrl: "https://huggingface.co/Nock-AI/nock-coder-1.5b-GGUF",
  xUrl: "https://x.com/useNockAI",

  // Token: the hero shows "CA Soon" until the address is filled in, then the address with a copy button.
  tokenTicker: "$NOCKAI",
  tokenAddress: "0xF78E30618e77A5671ee90bA4f43BaF19C2194987",

  // Kaggle: the "Nock Agent" row appears in the models list once this link is filled in (after a real submission).
  kaggleEntryUrl: "",

  // Hero media generated with scripts/generate_assets.py and processed by scripts/process_hero_video.py.
  // Leave empty to fall back to the CSS glow.
  heroImage: "assets/hero-e-poster.jpg",
  heroVideo: [
    { src: "assets/hero-e-1080.mp4", type: "video/mp4", media: "(min-width: 1280px)" },
    { src: "assets/hero-e-720.mp4", type: "video/mp4" }
  ],

  // Alternative hero clips for local comparison: open /?hero=studio, /?hero=range, /?hero=prisms or /?hero=meadow
  heroVariants: {
    studio: {
      image: "assets/hero-poster.jpg",
      video: [
        { src: "assets/hero-1080.mp4", type: "video/mp4", media: "(min-width: 1280px)" },
        { src: "assets/hero-720.mp4", type: "video/mp4" }
      ]
    },
    hall: {
      image: "assets/hero-e-poster.jpg",
      video: [
        { src: "assets/hero-e-1080.mp4", type: "video/mp4", media: "(min-width: 1280px)" },
        { src: "assets/hero-e-720.mp4", type: "video/mp4" }
      ]
    },
    range: {
      image: "assets/hero-d-poster.jpg",
      video: [
        { src: "assets/hero-d-1080.mp4", type: "video/mp4", media: "(min-width: 1280px)" },
        { src: "assets/hero-d-720.mp4", type: "video/mp4" }
      ]
    },
    prisms: {
      image: "assets/hero-c-poster.jpg",
      video: [{ src: "assets/hero-c-720.mp4", type: "video/mp4" }]
    },
    meadow: {
      image: "assets/hero-b-poster.jpg",
      video: [{ src: "assets/hero-b-720.mp4", type: "video/mp4" }]
    }
  }
};
