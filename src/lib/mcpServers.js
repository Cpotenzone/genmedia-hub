import {
  Brain,
  Video,
  Image,
  Music,
  Mic,
  AudioLines,
  Film,
} from "lucide-react";

export const mcpServers = [
  {
    id: "gstack-mcp",
    name: "AI Engineering Agents",
    icon: Brain,
    color: "from-violet-500 to-purple-600",
    featured: true,
    description:
      "12 senior-level AI agents for product strategy, code review, security audits, architecture review, debugging, documentation, and retrospectives. Powered by Gemini 2.5 Pro with 50-100K byte system prompts encoding cognitive frameworks and decision principles.",
    tools: [
      {
        id: "gstack_office_hours",
        name: "Office Hours",
        description:
          "YC-style product advisor. Pushes back hard with six forcing questions that expose demand reality, status quo assumptions, and the narrowest wedge to start with.",
        role: "Product Advisor",
        resultType: "text",
        parameters: [
          {
            name: "description",
            type: "textarea",
            label: "Describe Your Idea",
            placeholder:
              "What are you building? Who is it for? What problem does it solve?",
            required: true,
          },
          {
            name: "mode",
            type: "select",
            label: "Mode",
            options: ["startup", "builder"],
            default: "startup",
          },
        ],
      },
      {
        id: "gstack_ceo_review",
        name: "CEO Review",
        description:
          "Strategic plan review to find the 10-star product. Can expand ambition, sharpen focus, or ruthlessly cut scope. Encodes Bezos, Munger, Jobs, and Grove decision frameworks.",
        role: "CEO / Founder",
        resultType: "text",
        parameters: [
          {
            name: "plan",
            type: "textarea",
            label: "Plan or Proposal",
            placeholder:
              "Paste your feature plan, design doc, or proposal here...",
            required: true,
          },
          {
            name: "mode",
            type: "select",
            label: "Review Mode",
            options: [
              "expansion",
              "selective_expansion",
              "hold_scope",
              "reduction",
            ],
            default: "selective_expansion",
          },
        ],
      },
      {
        id: "gstack_eng_review",
        name: "Engineering Review",
        description:
          "Architecture review that forces hidden assumptions into the open. Traces data flows, builds test matrices, checks rollback scenarios, catches missing error handling.",
        role: "Engineering Manager",
        resultType: "text",
        parameters: [
          {
            name: "plan",
            type: "textarea",
            label: "Technical Plan or Architecture",
            placeholder:
              "Paste your architecture doc, technical design, or implementation plan...",
            required: true,
          },
        ],
      },
      {
        id: "gstack_design_review",
        name: "Design Review",
        description:
          "Visual and UX audit. Rates each dimension 0-10, explains what a 10 looks like. Detects AI slop. Covers hierarchy, typography, color, spacing, components, density, states, responsive, and accessibility.",
        role: "Senior Designer",
        resultType: "text",
        parameters: [
          {
            name: "design_description",
            type: "textarea",
            label: "Design Description or Screenshot URL",
            placeholder:
              "Describe the UI/UX you want reviewed, or paste a screenshot URL...",
            required: true,
          },
        ],
      },
      {
        id: "gstack_devex_review",
        name: "DX Review",
        description:
          "Developer experience audit. Primary benchmark: TTHW (Time To Hello World). Maps developer personas, friction points, the magical moment, and documentation gaps.",
        role: "Developer Experience Lead",
        resultType: "text",
        parameters: [
          {
            name: "description",
            type: "textarea",
            label: "API / SDK / CLI Description",
            placeholder:
              "Describe the developer-facing tool, API, or SDK you want reviewed...",
            required: true,
          },
          {
            name: "mode",
            type: "select",
            label: "Mode",
            options: ["dx_expansion", "dx_polish", "dx_triage"],
            default: "dx_polish",
          },
        ],
      },
      {
        id: "gstack_code_review",
        name: "Code Review",
        description:
          "Staff-level code review. Finds bugs that pass CI but blow up in production. Hunts race conditions, nil dereferences, missing timeouts, stale state, degrading queries.",
        role: "Staff Engineer",
        resultType: "text",
        parameters: [
          {
            name: "code",
            type: "textarea",
            label: "Code or Diff",
            placeholder: "Paste your code, PR diff, or file contents here...",
            required: true,
          },
        ],
      },
      {
        id: "gstack_cso",
        name: "Security Audit",
        description:
          "OWASP Top 10 + STRIDE threat model. 8/10+ confidence gate — only surfaces independently verified findings. Zero-noise.",
        role: "Chief Security Officer",
        resultType: "text",
        parameters: [
          {
            name: "code",
            type: "textarea",
            label: "Code to Audit",
            placeholder:
              "Paste authentication code, API handlers, or security-sensitive logic...",
            required: true,
          },
        ],
      },
      {
        id: "gstack_investigate",
        name: "Investigate",
        description:
          "Systematic root-cause debugger. Iron Law: no fixes without investigation. Traces data flow, tests hypotheses, escalates after 3 failed attempts with structured report.",
        role: "Debugger",
        resultType: "text",
        parameters: [
          {
            name: "problem_description",
            type: "textarea",
            label: "Problem Description",
            placeholder:
              "Describe the bug, error, or unexpected behavior. Include error messages, logs, steps to reproduce...",
            required: true,
          },
        ],
      },
      {
        id: "gstack_autoplan",
        name: "Auto Plan",
        description:
          "Full review pipeline: CEO → Design → Engineering in sequence. Encodes decision principles between stages. Surfaces only taste decisions requiring human judgment.",
        role: "Pipeline Orchestrator",
        resultType: "text",
        parameters: [
          {
            name: "feature_description",
            type: "textarea",
            label: "Feature Description",
            placeholder:
              "Describe the feature you want planned end-to-end...",
            required: true,
          },
        ],
      },
      {
        id: "gstack_document_generate",
        name: "Generate Docs",
        description:
          "Generates missing documentation using the Diataxis framework: reference, how-to, tutorial, or explanation. Reads codebase context first.",
        role: "Documentation Author",
        resultType: "text",
        parameters: [
          {
            name: "context",
            type: "textarea",
            label: "Code or Context",
            placeholder:
              "Paste the code, feature description, or context to generate docs for...",
            required: true,
          },
          {
            name: "doc_type",
            type: "select",
            label: "Doc Type (Diataxis)",
            options: ["reference", "howto", "tutorial", "explanation"],
            default: "howto",
          },
        ],
      },
      {
        id: "gstack_document_release",
        name: "Release Docs",
        description:
          "Updates all project documentation to match what was just shipped. Catches stale READMEs, builds a Diataxis coverage map, checks changelog entries.",
        role: "Technical Writer",
        resultType: "text",
        parameters: [
          {
            name: "shipped_description",
            type: "textarea",
            label: "What Was Shipped",
            placeholder:
              "Describe what was just deployed — PR summary, feature list, diff overview...",
            required: true,
          },
        ],
      },
      {
        id: "gstack_retro",
        name: "Retrospective",
        description:
          "Team-aware sprint retrospective. Per-person breakdowns, shipping streaks, test health trends, recurring blockers, growth opportunities. Produces 3 concrete action items.",
        role: "Engineering Manager",
        resultType: "text",
        parameters: [
          {
            name: "time_period",
            type: "text",
            label: "Time Period",
            placeholder: "e.g. 'last week', 'sprint 14', 'June 1-14'",
            required: true,
          },
          {
            name: "team_context",
            type: "textarea",
            label: "Team Context",
            placeholder:
              "Who's on the team? What were the goals? Any notable events?",
            required: false,
          },
        ],
      },
    ],
  },
  {
    id: "genmedia-veo",
    name: "Video Generation",
    icon: Video,
    color: "from-blue-500 to-cyan-500",
    description:
      "Generate cinematic videos from text prompts or reference images using Google's Veo model family. Supports text-to-video, image-to-video, frame interpolation, video extension, and reference-guided generation. Veo 3+ includes native audio.",
    tools: [
      {
        id: "veo_t2v",
        name: "Text to Video",
        description:
          "Generate a video from a text prompt. Default: Veo 3.1 Fast (16:9, 4-8s, with audio).",
        resultType: "video",
        parameters: [
          {
            name: "prompt",
            type: "textarea",
            label: "Video Prompt",
            placeholder:
              "A drone shot flying over a misty coastline at golden hour, cinematic motion...",
            required: true,
          },
          {
            name: "model",
            type: "select",
            label: "Model",
            options: [
              "veo-3.1-fast-generate-001",
              "veo-3.1-generate-001",
              "veo-3.1-lite-generate-001",
              "veo-3.0-fast-generate-001",
              "veo-3.0-generate-001",
              "veo-2.0-generate-001",
            ],
            default: "veo-3.1-fast-generate-001",
          },
          {
            name: "duration",
            type: "select",
            label: "Duration (seconds)",
            options: ["4", "5", "6", "7", "8"],
            default: "6",
          },
          {
            name: "aspect_ratio",
            type: "select",
            label: "Aspect Ratio",
            options: ["16:9", "9:16"],
            default: "16:9",
          },
        ],
      },
      {
        id: "veo_i2v",
        name: "Image to Video",
        description:
          "Animate a single image with a text prompt describing the motion.",
        resultType: "video",
        parameters: [
          {
            name: "image_url",
            type: "text",
            label: "Source Image URL",
            placeholder: "https://storage.googleapis.com/... or local path",
            required: true,
          },
          {
            name: "prompt",
            type: "textarea",
            label: "Motion Prompt",
            placeholder: "Camera slowly zooms in while clouds drift...",
            required: true,
          },
          {
            name: "duration",
            type: "select",
            label: "Duration (seconds)",
            options: ["4", "5", "6", "8"],
            default: "4",
          },
        ],
      },
      {
        id: "veo_first_last_to_video",
        name: "First + Last Frame",
        description:
          "Provide a start and end image; Veo generates the transition video between them.",
        resultType: "video",
        parameters: [
          {
            name: "first_frame_url",
            type: "text",
            label: "First Frame Image URL",
            placeholder: "URL to the starting frame image",
            required: true,
          },
          {
            name: "last_frame_url",
            type: "text",
            label: "Last Frame Image URL",
            placeholder: "URL to the ending frame image",
            required: true,
          },
          {
            name: "prompt",
            type: "textarea",
            label: "Transition Description",
            placeholder: "Describe the motion and transition between frames...",
            required: false,
          },
        ],
      },
      {
        id: "veo_extend_video",
        name: "Extend Video",
        description:
          "Take an existing video and extend it forward in time.",
        resultType: "video",
        parameters: [
          {
            name: "video_url",
            type: "text",
            label: "Source Video URL",
            placeholder: "gs://casey-genmedia-output/... or local path",
            required: true,
          },
          {
            name: "prompt",
            type: "textarea",
            label: "Extension Prompt",
            placeholder: "Describe what should happen next in the video...",
            required: false,
          },
        ],
      },
      {
        id: "veo_reference_to_video",
        name: "Reference to Video",
        description:
          "Use up to 3 reference images to guide the visual style of a generated video.",
        resultType: "video",
        parameters: [
          {
            name: "reference_urls",
            type: "textarea",
            label: "Reference Image URLs (one per line)",
            placeholder: "https://...\nhttps://...\nhttps://...",
            required: true,
          },
          {
            name: "prompt",
            type: "textarea",
            label: "Video Prompt",
            placeholder: "Describe the video to generate in this style...",
            required: true,
          },
        ],
      },
      {
        id: "veo_ingredients_to_video",
        name: "Ingredients to Video",
        description:
          "Reference-guided generation optimized for product/object-centric images.",
        resultType: "video",
        parameters: [
          {
            name: "ingredient_urls",
            type: "textarea",
            label: "Product/Object Image URLs (one per line)",
            placeholder: "URLs to product or object reference images...",
            required: true,
          },
          {
            name: "prompt",
            type: "textarea",
            label: "Video Prompt",
            placeholder: "Describe the product video to generate...",
            required: true,
          },
        ],
      },
    ],
  },
  {
    id: "genmedia-nanobanana",
    name: "Image Generation",
    icon: Image,
    color: "from-pink-500 to-rose-500",
    description:
      "Generate and edit images using Gemini's image generation models (Nano Banana family). Supports text-to-image, image editing with input images, and multi-image composition. Fast, high-quality, instruction-following.",
    tools: [
      {
        id: "nanobanana_image_generation",
        name: "Generate / Edit Image",
        description:
          "Generate or edit images from a text prompt. Optionally provide input images for editing/compositing. Supports 13 aspect ratios.",
        resultType: "image",
        parameters: [
          {
            name: "prompt",
            type: "textarea",
            label: "Prompt",
            placeholder:
              "A product shot of a glass bottle on marble, studio lighting, soft shadows...",
            required: true,
          },
          {
            name: "input_image_url",
            type: "text",
            label: "Input Image URL (optional, for editing)",
            placeholder: "Leave empty for text-to-image generation",
            required: false,
          },
          {
            name: "model",
            type: "select",
            label: "Model",
            options: [
              "gemini-3.1-flash-image",
              "gemini-3-pro-image",
              "gemini-2.5-flash-image",
            ],
            default: "gemini-3.1-flash-image",
          },
          {
            name: "aspect_ratio",
            type: "select",
            label: "Aspect Ratio",
            options: ["1:1", "3:4", "4:3", "9:16", "16:9", "21:9"],
            default: "16:9",
          },
        ],
      },
    ],
  },
  {
    id: "genmedia-lyria",
    name: "Music Generation",
    icon: Music,
    color: "from-green-500 to-emerald-500",
    description:
      "Generate original music and audio compositions using Google's Lyria model. Describe genre, mood, instrumentation, and tempo. Output saved to GCS or local.",
    tools: [
      {
        id: "lyria_generate_music",
        name: "Generate Music",
        description:
          "Generate an original music track from a text description. Specify genre, mood, instruments, and duration.",
        resultType: "audio",
        parameters: [
          {
            name: "prompt",
            type: "textarea",
            label: "Music Description",
            placeholder:
              "Upbeat lo-fi hip hop with warm vinyl crackle, mellow piano chords, and a head-nodding beat...",
            required: true,
          },
          {
            name: "duration",
            type: "select",
            label: "Duration (seconds)",
            options: ["15", "30", "60", "90", "120"],
            default: "30",
          },
        ],
      },
    ],
  },
  {
    id: "genmedia-chirp3",
    name: "Speech Synthesis",
    icon: Mic,
    color: "from-orange-500 to-amber-500",
    description:
      "High-fidelity text-to-speech using Google's Chirp3 HD voices. Natural prosody, emotional range, and custom pronunciation support via IPA/X-SAMPA. Premium quality for voiceovers, narration, and demos.",
    tools: [
      {
        id: "chirp_tts",
        name: "Text to Speech",
        description:
          "Synthesize speech from text using a Chirp3-HD voice. Supports custom pronunciation overrides in IPA or X-SAMPA phonetic notation.",
        resultType: "audio",
        parameters: [
          {
            name: "text",
            type: "textarea",
            label: "Text to Speak",
            placeholder: "Enter the text you want converted to speech...",
            required: true,
          },
          {
            name: "voice",
            type: "select",
            label: "Voice",
            options: [
              "en-US-Chirp3-HD-Zephyr",
              "en-US-Chirp3-HD-Aoede",
              "en-US-Chirp3-HD-Charon",
              "en-US-Chirp3-HD-Fenrir",
              "en-US-Chirp3-HD-Kore",
              "en-US-Chirp3-HD-Puck",
            ],
            default: "en-US-Chirp3-HD-Zephyr",
          },
          {
            name: "pronunciations",
            type: "textarea",
            label: "Custom Pronunciations (optional)",
            placeholder:
              "word=pronunciation (IPA), e.g.:\nVeo=viːoʊ\nGemini=dʒɛmɪnaɪ",
            required: false,
          },
        ],
      },
      {
        id: "list_chirp_voices",
        name: "List Voices",
        description:
          "List available Chirp3-HD voices filtered by language.",
        resultType: "text",
        parameters: [
          {
            name: "language",
            type: "text",
            label: "Language Code",
            placeholder: "e.g. en-US, fr-FR, es-ES",
            required: false,
          },
        ],
      },
    ],
  },
  {
    id: "genmedia-gemini",
    name: "Gemini TTS & Image",
    icon: AudioLines,
    color: "from-indigo-500 to-blue-600",
    description:
      "Gemini-native TTS with expressive style control plus image generation. Describe HOW the speech should sound in natural language — tone, accent, emotion, pacing. 30 voices available.",
    tools: [
      {
        id: "gemini_audio_tts",
        name: "Expressive TTS",
        description:
          "Synthesize speech with natural-language style control. Describe delivery, tone, accent, and emotional expression. The key differentiator: you prompt the style.",
        resultType: "audio",
        parameters: [
          {
            name: "text",
            type: "textarea",
            label: "Text to Speak",
            placeholder: "Enter the text you want spoken...",
            required: true,
          },
          {
            name: "style",
            type: "textarea",
            label: "Style Description",
            placeholder:
              "Speak with warmth and a slight British accent, like a friendly teacher explaining something fascinating...",
            required: true,
          },
          {
            name: "voice",
            type: "select",
            label: "Voice",
            options: [
              "Callirrhoe",
              "Aoede",
              "Charon",
              "Fenrir",
              "Kore",
              "Puck",
              "Zephyr",
              "Sulafat",
            ],
            default: "Callirrhoe",
          },
          {
            name: "model",
            type: "select",
            label: "Model",
            options: [
              "gemini-3.1-flash-tts-preview",
              "gemini-2.5-flash-tts",
              "gemini-2.5-pro-tts",
              "gemini-2.5-flash-lite-preview-tts",
            ],
            default: "gemini-3.1-flash-tts-preview",
          },
          {
            name: "format",
            type: "select",
            label: "Output Format",
            options: ["wav", "mp3", "ogg_opus", "m4a"],
            default: "wav",
          },
        ],
      },
      {
        id: "gemini_image_generation",
        name: "Gemini Image Gen",
        description:
          "Generate or edit images using Gemini image models (same as nanobanana).",
        resultType: "image",
        parameters: [
          {
            name: "prompt",
            type: "textarea",
            label: "Image Prompt",
            placeholder: "Describe the image to generate...",
            required: true,
          },
          {
            name: "aspect_ratio",
            type: "select",
            label: "Aspect Ratio",
            options: ["1:1", "3:4", "4:3", "9:16", "16:9"],
            default: "16:9",
          },
        ],
      },
      {
        id: "list_gemini_voices",
        name: "List Voices",
        description: "List all available single-speaker Gemini TTS voices.",
        resultType: "text",
        parameters: [],
      },
    ],
  },
  {
    id: "genmedia-avtool",
    name: "AV Compositing",
    icon: Film,
    color: "from-teal-500 to-cyan-600",
    description:
      "AI-native AV compositing with ffmpeg. Combine, layer, cut, and post-process audio and video. The glue layer between generative tools — combine Veo video with Lyria music into final deliverables. Supports local paths and gs:// URIs.",
    tools: [
      {
        id: "ffmpeg_combine_audio_and_video",
        name: "Combine Audio + Video",
        description:
          "Merge a separate audio track and video file into a single output. Supports per-track volume adjustment.",
        resultType: "video",
        parameters: [
          {
            name: "video_url",
            type: "text",
            label: "Video File URL",
            placeholder: "gs://casey-genmedia-output/video.mp4",
            required: true,
          },
          {
            name: "audio_url",
            type: "text",
            label: "Audio File URL",
            placeholder: "gs://casey-genmedia-output/music.wav",
            required: true,
          },
          {
            name: "audio_volume_db",
            type: "text",
            label: "Audio Volume Adjustment (dB)",
            placeholder: "-3 (reduce by 3dB) or +3 (boost by 3dB)",
            required: false,
          },
        ],
      },
      {
        id: "ffmpeg_layer_audio_files",
        name: "Layer Audio",
        description:
          "Mix (layer) multiple audio files together into one combined track.",
        resultType: "audio",
        parameters: [
          {
            name: "audio_urls",
            type: "textarea",
            label: "Audio File URLs (one per line)",
            placeholder:
              "gs://casey-genmedia-output/voice.wav\ngs://casey-genmedia-output/music.wav",
            required: true,
          },
        ],
      },
      {
        id: "ffmpeg_concatenate_media_files",
        name: "Concatenate Media",
        description:
          "Join multiple audio or video files end-to-end in sequence.",
        resultType: "video",
        parameters: [
          {
            name: "media_urls",
            type: "textarea",
            label: "Media File URLs (one per line, in order)",
            placeholder:
              "gs://casey-genmedia-output/clip1.mp4\ngs://casey-genmedia-output/clip2.mp4",
            required: true,
          },
        ],
      },
      {
        id: "ffmpeg_adjust_volume",
        name: "Adjust Volume",
        description:
          "Raise or lower the volume of an audio file by a specified dB amount.",
        resultType: "audio",
        parameters: [
          {
            name: "audio_url",
            type: "text",
            label: "Audio File URL",
            placeholder: "gs://casey-genmedia-output/track.wav",
            required: true,
          },
          {
            name: "volume_db",
            type: "text",
            label: "Volume Adjustment (dB)",
            placeholder: "-6 or +3",
            required: true,
          },
        ],
      },
      {
        id: "ffmpeg_overlay_image_on_video",
        name: "Overlay Image",
        description:
          "Burn an image (logo, watermark, title card) onto a video at specified coordinates.",
        resultType: "video",
        parameters: [
          {
            name: "video_url",
            type: "text",
            label: "Video File URL",
            placeholder: "gs://casey-genmedia-output/video.mp4",
            required: true,
          },
          {
            name: "image_url",
            type: "text",
            label: "Image Overlay URL",
            placeholder: "gs://casey-genmedia-output/logo.png",
            required: true,
          },
          {
            name: "position",
            type: "select",
            label: "Position",
            options: [
              "top-left",
              "top-right",
              "bottom-left",
              "bottom-right",
              "center",
            ],
            default: "bottom-right",
          },
        ],
      },
      {
        id: "ffmpeg_video_to_gif",
        name: "Video to GIF",
        description:
          "Convert a video to an animated GIF with configurable FPS and scale.",
        resultType: "image",
        parameters: [
          {
            name: "video_url",
            type: "text",
            label: "Video File URL",
            placeholder: "gs://casey-genmedia-output/video.mp4",
            required: true,
          },
          {
            name: "fps",
            type: "select",
            label: "FPS",
            options: ["10", "12", "15", "20", "24"],
            default: "15",
          },
          {
            name: "scale",
            type: "select",
            label: "Width (px)",
            options: ["320", "480", "640", "800"],
            default: "480",
          },
        ],
      },
      {
        id: "ffmpeg_convert_audio_wav_to_mp3",
        name: "WAV to MP3",
        description: "Convert a WAV file to MP3.",
        resultType: "audio",
        parameters: [
          {
            name: "audio_url",
            type: "text",
            label: "WAV File URL",
            placeholder: "gs://casey-genmedia-output/voice.wav",
            required: true,
          },
        ],
      },
      {
        id: "ffmpeg_get_media_info",
        name: "Media Info",
        description:
          "Inspect any media file — returns stream info, codec, duration, bitrate, resolution.",
        resultType: "text",
        parameters: [
          {
            name: "media_url",
            type: "text",
            label: "Media File URL",
            placeholder: "gs://casey-genmedia-output/file.mp4",
            required: true,
          },
        ],
      },
    ],
  },
];
