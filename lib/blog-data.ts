export type BlogData = {
    id: string;
    title: string;
    slug: string;   
    description: string;
    content: string; // Gardé pour compatibilité (HTML ou vide si composant)
    readTime?: number; // Temps de lecture en minutes (optionnel, calculé si non fourni)
    imageUrl: string;
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
    ogImage: string;
    createdAt: Date;
    categoryId: string;    
}

export type BlogCategory = {
    id: string;
    name: string;
    slug: string;
}

export function generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .replace(/^-+|-+$/g, '')
  }

export const blogCategories = [
    {
        id: "1",
        name: "Bail Notarié",
        slug: "bail-notarié",
    },
]



export const blogData = [
    {
        id: "blog-1",
        title:"Bail Notarié : Qu'est-ce que c'est et pourquoi le choisir ?",
        slug: generateSlug("Bail Notarié : Qu'est-ce que c'est et pourquoi le choisir ?"),
        description: "Découvrez les avantages du bail notarié et pourquoi il peut être un choix judicieux pour sécuriser votre location immobilière.",
        content: "", // Le contenu est maintenant géré par le composant React
        readTime: 5, // Temps de lecture estimé en minutes
        metaTitle: "Bail Notarié : Qu'est-ce que c'est et pourquoi le choisir ?",
        metaDescription: "Découvrez les avantages du bail notarié et pourquoi il peut être un choix judicieux pour sécuriser votre location immobilière.",
        metaKeywords: "bail notarié, avantages, sécurité, location immobilière, notaire",
        imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop",
        ogImage: "https://www.bailnotarie.fr/og-cover-v2.png",
        createdAt: new Date("2025-05-01"),
        categoryId: "1",
      },
      {
        id: "blog-2",
        title: "Les étapes pour établir un bail notarié : guide complet",
        slug: generateSlug("Les étapes pour établir un bail notarié : guide complet"),
        description: "Guide étape par étape pour établir un bail notarié, de la préparation des documents à la signature chez le notaire.",
        content: "", // Le contenu est maintenant géré par le composant React
        readTime: 6, // Temps de lecture estimé en minutes
        metaTitle: "Les étapes pour établir un bail notarié : guide complet",
        metaDescription: "Guide étape par étape pour établir un bail notarié, de la préparation des documents à la signature chez le notaire.",
        metaKeywords: "bail notarié, étapes, guide, notaire, préparation, documents",
        imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=400&fit=crop",
        ogImage: "https://www.bailnotarie.fr/og-cover-v2.png",
        createdAt: new Date("2025-05-10"),
        categoryId: "1",
      },
      {
        id: "blog-3",
        title: "Force exécutoire : l'avantage majeur du bail notarié",
        slug: generateSlug("Force exécutoire : l'avantage majeur du bail notarié"),
        description: "Comprendre la force exécutoire du bail notarié et ses implications concrètes en cas de litige locatif.",
        content: "", // Le contenu est maintenant géré par le composant React
        readTime: 4, // Temps de lecture estimé en minutes
        metaTitle: "Force exécutoire : l'avantage majeur du bail notarié",
        metaDescription: "Comprendre la force exécutoire du bail notarié et ses implications concrètes en cas de litige locatif.",
        metaKeywords: "bail notarié, force exécutoire, propriétaire, locataire, notaire",
        imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=400&fit=crop",
        ogImage: "https://www.bailnotarie.fr/og-cover-v2.png",
        createdAt: new Date("2025-05-15"),
        categoryId: "1",
      },
      {
        id: "blog-4",
        title: "Bail notarié vs bail classique : analyse comparative",
        slug: generateSlug("Bail notarié vs bail classique : analyse comparative"),
        description: "Comparaison détaillée entre le bail notarié et le bail sous seing privé pour vous aider à faire le bon choix.",
        content: "", // Le contenu est maintenant géré par le composant React
        readTime: 7, // Temps de lecture estimé en minutes
        metaTitle: "Bail notarié vs bail classique : analyse comparative",
        metaDescription: "Comparaison détaillée entre le bail notarié et le bail sous seing privé pour vous aider à faire le bon choix.",
        metaKeywords: "bail notarié, bail classique, analyse comparative, propriétaire, locataire, notaire",
        imageUrl: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&h=400&fit=crop",
        ogImage: "https://www.bailnotarie.fr/og-cover-v2.png",
        createdAt: new Date("2025-05-20"),
        categoryId: "1",
      },
      {
        id: "blog-5",
        title: "Les obligations légales dans un bail notarié",
        slug: generateSlug("Les obligations légales dans un bail notarié"),
        description: "Découvrez les obligations légales spécifiques au bail notarié et comment elles protègent propriétaire et locataire.",
        content: "", // Le contenu est maintenant géré par le composant React
        readTime: 6, // Temps de lecture estimé en minutes
        metaTitle: "Les obligations légales dans un bail notarié",
        metaDescription: "Découvrez les obligations légales spécifiques au bail notarié et comment elles protègent propriétaire et locataire.",
        metaKeywords: "bail notarié, obligations légales, propriétaire, locataire, notaire",
        imageUrl: "https://images.pexels.com/photos/5668858/pexels-photo-5668858.jpeg?auto=compress&cs=tinysrgb&w=1200",
        ogImage: "https://www.bailnotarie.fr/og-cover-v2.png",
        createdAt: new Date("2025-05-25"),
        categoryId: "1",
      },
]