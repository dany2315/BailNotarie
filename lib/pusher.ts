import Pusher from "pusher";

if (!process.env.PUSHER_APP_ID) {
  throw new Error("PUSHER_APP_ID is not set");
}

if (!process.env.PUSHER_KEY) {
  throw new Error("PUSHER_KEY is not set");
}

if (!process.env.PUSHER_SECRET) {
  throw new Error("PUSHER_SECRET is not set");
}

if (!process.env.PUSHER_CLUSTER) {
  throw new Error("PUSHER_CLUSTER is not set");
}

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

/**
 * Récupère la liste des utilisateurs connectés à un presence channel
 * @param channelName - Le nom du channel (ex: presence-bail-xxx)
 * @returns Un tableau d'IDs d'utilisateurs connectés
 */
export async function getPresenceChannelUsers(channelName: string): Promise<string[]> {
  try {
    const response = await pusherServer.get({
      path: `/channels/${channelName}/users`,
    });
    
    if (response.status === 200) {
      const body = await response.json();
      // L'API renvoie { users: [{ id: "user_id" }, ...] }
      return (body.users || []).map((u: { id: string }) => u.id);
    }
    
    return [];
  } catch (error) {
    // Si le channel n'existe pas ou n'a pas de membres, retourner un tableau vide
    console.error("Erreur lors de la récupération des utilisateurs du channel:", error);
    return [];
  }
}

/**
 * Vérifie si un utilisateur est connecté à un presence channel
 * @param channelName - Le nom du channel (ex: presence-bail-xxx)
 * @param userId - L'ID de l'utilisateur à vérifier
 * @returns true si l'utilisateur est connecté, false sinon
 */
export async function isUserOnlineInChannel(channelName: string, userId: string): Promise<boolean> {
  const users = await getPresenceChannelUsers(channelName);
  return users.includes(userId);
}


