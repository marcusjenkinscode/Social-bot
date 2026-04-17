
**The file covers everything Copilot needs to build the full bot:**

| Section | What it defines |
|---|---|
| 📁 **File Structure** | All modules: `social_bot.py`, `platforms/`, `utils/`, `logs/` |
| 🔑 **Credentials** | `.env.example` template for Reddit, YouTube, Facebook & LinkedIn |
| 🖥️ **Main Menu** | Rich terminal UI with banner, numbered options |
| 🪜 **Step-by-Step Flow** | Platform select → Compose → Preview → Confirm → Post |
| 📝 **Per-Platform Prompts** | Tailored interactive questions for each platform (subreddit, flairs, video privacy, LinkedIn visibility, etc.) |
| 👁️ **Preview Panel** | Formatted `rich` panel before anything is sent |
| ⚙️ **Settings Menu** | Credential checker, subreddit manager, schedule defaults |
| 🛡️ **Error Handling** | Retry logic, rate-limit handling, file validation, dry-run & verbose flags |
| 🧱 **Code Standards** | `BasePoster` interface, type hints, logging, docstrings, graceful Ctrl+C |
| 📦 **`requirements.txt`** | All pip dependencies listed |
