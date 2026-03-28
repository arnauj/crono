# Crono Timer

A full-featured CrossFit / workout timer built with React, TypeScript, and Tailwind CSS.

## Timer Modes

- **Clock** — Real-time clock display
- **Tabata** — Configurable work/rest intervals with round tracking
- **For Time** — Count-up timer with time cap
- **EMOM** — Every Minute on the Minute
- **AMRAP** — As Many Reps As Possible with countdown
- **Custom** — Build your own WOD with multiple segments (work, rest, prep)

## Features

- Fullscreen mode for gym/box display
- Screen wake lock to prevent sleep during workouts
- Audio cues for phase transitions
- Keyboard navigation (Escape to go back)
- Direct URL access to any mode (e.g. `/fortime`, `/tabata`)
- Persistent settings via localStorage
- Responsive design for mobile and large screens
- No external dependencies beyond React

## Tech Stack

- **React 19** + **TypeScript**
- **Tailwind CSS 4**
- **Vite 8**

## Getting Started

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Deployment

The `dist/` folder is a static SPA. For Apache, enable `mod_rewrite` and use the included `.htaccess` for client-side routing fallback. Make sure `AllowOverride All` is set for the document root.

## License

MIT
