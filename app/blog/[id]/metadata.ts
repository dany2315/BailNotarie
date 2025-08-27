import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const articleTitle = "Bail notarié vs bail classique : quelles différences ?";
  const articleDescription = "Découvrez les avantages du bail notarié par rapport au bail sous seing privé et pourquoi il peut être un choix judicieux pour votre location.";
  
  return {
    title: `${articleTitle} - Blog BailNotarie`,
    description: articleDescription,
    keywords: [
      "bail notarié vs classique",
      "différences bail authentique",
      "avantages bail notarié",
      "force exécutoire",
      "sécurité juridique",
      "comparaison baux"
    ],
    openGraph: {
      title: articleTitle,
      description: articleDescription,
      url: `https://bailnotarie.fr/blog/${params.id}`,
      type: "article",
      publishedTime: "2024-01-15T00:00:00.000Z",
      authors: ["Équipe BailNotarie"],
      images: [
        {
          url: "https://images.pexels.com/photos/5668858/pexels-photo-5668858.jpeg?auto=compress&cs=tinysrgb&w=1200",
          width: 1200,
          height: 630,
          alt: articleTitle
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: articleTitle,
      description: articleDescription,
      images: ["https://images.pexels.com/photos/5668858/pexels-photo-5668858.jpeg?auto=compress&cs=tinysrgb&w=1200"]
    }
  };
}
