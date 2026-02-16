"use client";

import Pusher from "pusher-js";

let pusherClient: Pusher | null = null;

export function getPusherClient() {
  if (pusherClient) {
    return pusherClient;
  }

  if (!process.env.NEXT_PUBLIC_PUSHER_KEY) {
    throw new Error("NEXT_PUBLIC_PUSHER_KEY is not set");
  }

  if (!process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
    throw new Error("NEXT_PUBLIC_PUSHER_CLUSTER is not set");
  }

  pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    authEndpoint: "/api/pusher/auth",
    // Pusher envoie automatiquement les données en format application/x-www-form-urlencoded
  });

  return pusherClient;
}

