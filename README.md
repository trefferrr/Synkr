# Synkr – Realtime Chat App (Monorepo)

> Modern, scalable, realtime chat built with microservices and Next.js.

![Status](https://img.shields.io/badge/status-active-success) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript) ![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js) ![Socket.IO](https://img.shields.io/badge/Socket.IO-realtime-010101?logo=socketdotio)

A full‑stack, microservices‑based realtime chat application with OTP (email) login, typing indicators, message seen, image upload (Cloudinary), and Socket.IO live updates. This repo contains three backend services and a Next.js frontend.

## Overview

- Backend
  - `backend/user`: OTP auth, users, Redis (Upstash compatible), RabbitMQ producer
  - `backend/chat`: chats, messages, Socket.IO server, Cloudinary uploads
  - `backend/mail`: RabbitMQ consumer, sends OTP emails via SMTP
- Frontend
  - `frontend`: Next.js 15 app (React 19), Socket.IO client, responsive UI

## Architecture

- OTP: `user` service issues OTP, stores in Redis, verifies, returns JWT
- Messaging: `chat` service manages chats/messages, emits events via Socket.IO
- Email: `mail` service consumes RabbitMQ queue `send-otp` and sends via SMTP
- Frontend: calls `user` and `chat` REST APIs; keeps live updates with Socket.IO

```
frontend (Next.js)  <--HTTPS-->  user (REST, Redis, RabbitMQ pub)
       |                                |
       |  Socket.IO                     v
       +---------------------->  chat (REST + Socket.IO, Cloudinary)
                                     |
                                     v
                                mail (RabbitMQ consumer -> SMTP)
```

## Tech Stack

- Frontend: Next.js 15, React 19, Tailwind CSS 4, axios, socket.io-client, js-cookie, react-hot-toast, lucide-react
- Backend: Node.js/Express, TypeScript, Mongoose (MongoDB), JWT, Multer + Cloudinary, Socket.IO
- Infra: Redis (Upstash), RabbitMQ, SMTP (Gmail or provider), Cloudinary
- Deployment: Vercel/CloudFront (FE), EC2 (BE), Nginx/Cloudflare for HTTPS

## Features

- Realtime messaging (Socket.IO) with robust reconnection and events
- OTP login via email (Redis/Upstash + RabbitMQ + SMTP)
- Secure JWT auth with guarded API routes
- Chats list with latest message preview and unseen counters
- Message types: text and images (Cloudinary uploads)
- Typing indicators, message seen/seenAt, message delete for everyone (sender)
- Create chat, hide/delete chat “for me” (local), fresh conversation on restart
- Responsive, mobile‑first UI with clean sidebar and message thread
- Optimistic UI updates and chat reordering on new activity
- Cloud‑ready configuration via environment variables

## Repository Structure

```
backend/
  chat/        # chat REST + Socket.IO
  user/        # auth/OTP/profile + Redis + RabbitMQ publisher
  mail/        # RabbitMQ consumer + SMTP sender
frontend/      # Next.js app
```

## Environment Variables

Create a `.env` per service (values are examples). Always use HTTPS URLs in production.

backend/user/.env
```
PORT=5000
MONGO_URI=<mongodb-connection-string>
REDIS_URL=<redis-or-upstash-url>
JWT_SECRET=<strong-secret>
RABBITMQ_HOST=<rabbitmq-host>
RABBITMQ_USERNAME=<rabbit-user>
RABBITMQ_PASSWORD=<rabbit-pass>
```

backend/chat/.env
```
PORT=5002
MONGO_URI=<mongodb-connection-string>
USER_SERVICE=<https user service base url>      # e.g. https://api.yourdomain.com
CLOUDINARY_CLOUD_NAME=<cloudinary>
CLOUDINARY_API_KEY=<cloudinary>
CLOUDINARY_API_SECRET=<cloudinary>
```

backend/mail/.env
```
PORT=5001
RABBITMQ_HOST=<rabbitmq-host>
RABBITMQ_USERNAME=<rabbit-user>
RABBITMQ_PASSWORD=<rabbit-pass>
SMTP_USER=<sender email>            # e.g. your@gmail.com
SMTP_PASSWORD=<smtp/app password>   # Gmail: App Password (2FA required)
```

frontend/.env.local (or Vercel Project Env)
```
NEXT_PUBLIC_USER_SERVICE=https://api.yourdomain.com
NEXT_PUBLIC_CHAT_SERVICE=https://chat.yourdomain.com
```

Update `frontend/src/context/AppContext.tsx` to read those:
```ts
export const user_service = process.env.NEXT_PUBLIC_USER_SERVICE || "http://localhost:5000";
export const chat_service = process.env.NEXT_PUBLIC_CHAT_SERVICE || "http://localhost:5002";
```

## Local Development

Prereqs: Node 18+, MongoDB, Redis/Upstash, RabbitMQ, SMTP creds, Cloudinary.

Install & run each service:

```bash
# user service
cd backend/user && npm i && npm run build && npm start

# chat service
cd ../chat && npm i && npm run build && npm start

# mail service
cd ../mail && npm i && npm run build && npm start

# frontend
cd ../../frontend && npm i && npm run dev
```

Open http://localhost:3000

## Production Deployment

Frontend
- Vercel or S3+CloudFront (serve HTTPS) using `NEXT_PUBLIC_*` API URLs

Backend (EC2 + PM2)
- Run `backend/user`, `backend/chat`, `backend/mail` via PM2 on ports 5000/5002/5001
- Place Nginx/ALB/Cloudflare in front for HTTPS and CORS

CORS (both user and chat services)
```ts
app.use(cors({
  origin: ["https://your-frontend-domain"],
  credentials: true
}));
```

Socket.IO CORS (`backend/chat/src/config/socket.ts`)
```ts
const io = new Server(server, {
  cors: { origin: "https://your-frontend-domain", methods: ["GET", "POST"] }
});
```

## API (Selected)

User service
- `POST /api/v1/login` { email } → 200 “OTP send to your mail”
- `POST /api/v1/verify` { email, otp } → { token, user }
- `GET /api/v1/me` (Bearer) → user
- `GET /api/v1/user/all` (Bearer) → users
- `GET /api/v1/user/:id` → user

Chat service
- `POST /api/v1/chat/new` (Bearer) { otherUserId }
- `GET /api/v1/chat/all` (Bearer)
- `POST /api/v1/message` (Bearer, multipart) { chatId, text?, image?, replyTo? }
- `GET /api/v1/message/:chatId` (Bearer)
- `DELETE /api/v1/message/:messageId` (sender-only, “delete for everyone”)

## Realtime Events

Server emits: `messageReceived`, `messageDeleted`, `messageSeen`, `getOnlineUser`

Client emits: `newMessage`, `typing`, `stopTyping`, `joinChat`, `leaveChat`

## Images

`backend/chat` uses Multer + Cloudinary. Set Cloudinary envs.

## Frontend Auth Sequencing

- In `AppContext`, call `fetchChats`/`fetchUsers` only after `fetchUser` succeeds and a token exists
- If any fetch returns 401, clear token and logout
- Always use HTTPS API URLs in production (avoid mixed‑content blocks)

## Troubleshooting

- Mixed Content (blocked HTTP from HTTPS): ensure `NEXT_PUBLIC_*` API URLs use HTTPS
- 401 spam on load: do not call chats/users until auth succeeds
- Gmail `EAUTH 534`: enable 2FA, use App Password; try port 587 `secure:false` if 465 blocked
- CORS errors: allow your frontend domain in both services; configure Socket.IO CORS
- “Unknown User”: set `USER_SERVICE` env in chat service to a reachable HTTPS user API

## Scripts

- Services: `npm run build` → `dist`, `npm start` → run service
- Frontend: `npm run dev`, `npm run build`, `npm start`

## License

MIT (update as needed)


