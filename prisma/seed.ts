import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Fonction pour générer un slug à partir d'un titre
function generateSlug(title: string): string {
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

async function main() {
  console.log('🌱 Début du seeding...')

  // Créer la catégorie "Bail Notarié"
  const category = await prisma.category.upsert({
    where: { slug: 'bail-notarie' },
    update: {},
    create: {
      name: 'Bail Notarié',
      slug: 'bail-notarie',
    },
  })

  console.log('✅ Catégorie créée:', category.name)

  // Articles de blog
  const articles = [
    {
      title: "Bail Notarié : Qu'est-ce que c'est et pourquoi le choisir ?",
      description: "Découvrez les avantages du bail notarié et pourquoi il peut être un choix judicieux pour sécuriser votre location immobilière.",
      content: `
        <h2>Qu'est-ce qu'un bail notarié ?</h2>
        <p>Un bail notarié est un contrat de location authentifié par un notaire. Contrairement au bail sous seing privé, il bénéficie d'une force exécutoire immédiate, ce qui signifie qu'il a la même valeur qu'un jugement de tribunal.</p>
        
        <h2>Les avantages principaux</h2>
        <h3>1. Force exécutoire immédiate</h3>
        <p>L'avantage principal du bail notarié réside dans sa force exécutoire. En cas d'impayés de loyer, le propriétaire peut directement procéder à une saisie sans passer par une procédure judiciaire longue et coûteuse.</p>
        
        <h3>2. Sécurité juridique renforcée</h3>
        <p>Le notaire vérifie la conformité du bail avec la législation en vigueur et s'assure que tous les éléments obligatoires sont présents. Cette validation par un professionnel du droit offre une sécurité juridique maximale.</p>
        
        <h3>3. Délais d'expulsion réduits</h3>
        <p>En cas de nécessité d'expulsion, les délais sont considérablement réduits. Alors qu'une procédure classique peut prendre 12 à 18 mois, un bail notarié permet une action en 2 à 3 mois seulement.</p>
        
        <h2>Conclusion</h2>
        <p>Le bail notarié représente un investissement judicieux pour les propriétaires souhaitant une sécurité maximale dans leurs relations locatives.</p>
      `,
      metaTitle: "Bail Notarié : Qu'est-ce que c'est et pourquoi le choisir ?",
      metaDescription: "Découvrez les avantages du bail notarié et pourquoi il peut être un choix judicieux pour sécuriser votre location immobilière.",
      metaKeywords: "bail notarié, avantages, sécurité, location immobilière, notaire",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop",
      ogImage: "https://www.bailnotarie.fr/og-cover-v2.png",
    },
    {
      title: "Les étapes pour établir un bail notarié : guide complet",
      description: "Guide étape par étape pour établir un bail notarié, de la préparation des documents à la signature chez le notaire.",
      content: `
        <h2>Étape 1 : Préparation des documents</h2>
        <p>Avant de vous rendre chez le notaire, vous devez préparer plusieurs documents essentiels :</p>
        <ul>
          <li>Le titre de propriété du bien</li>
          <li>Les diagnostics techniques obligatoires</li>
          <li>L'état des lieux d'entrée</li>
          <li>Les informations sur le locataire</li>
        </ul>
        
        <h2>Étape 2 : Rendez-vous chez le notaire</h2>
        <p>Le notaire va :</p>
        <ul>
          <li>Vérifier l'identité des parties</li>
          <li>Expliquer les clauses du contrat</li>
          <li>S'assurer de la conformité légale</li>
          <li>Authentifier le document</li>
        </ul>
        
        <h2>Étape 3 : Coûts et délais</h2>
        <p>Les frais de notaire varient selon la valeur du bien et la complexité du dossier. Comptez généralement entre 1% et 3% du montant annuel du loyer.</p>
        
        <h2>Conclusion</h2>
        <p>Bien que plus coûteux initialement, le bail notarié offre une sécurité juridique incomparable.</p>
      `,
      metaTitle: "Les étapes pour établir un bail notarié : guide complet",
      metaDescription: "Guide étape par étape pour établir un bail notarié, de la préparation des documents à la signature chez le notaire.",
      metaKeywords: "bail notarié, étapes, guide, notaire, préparation, documents",
      imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=400&fit=crop",
      ogImage: "https://www.bailnotarie.fr/og-cover-v2.png",
    },
    {
      title: "Force exécutoire : l'avantage majeur du bail notarié",
      description: "Comprendre la force exécutoire du bail notarié et ses implications concrètes en cas de litige locatif.",
      content: `
        <h2>Qu'est-ce que la force exécutoire ?</h2>
        <p>La force exécutoire est la capacité d'un document à être exécuté directement, sans passer par une procédure judiciaire préalable. C'est exactement ce que confère le bail notarié.</p>
        
        <h2>Avantages en cas d'impayés</h2>
        <h3>Procédure accélérée</h3>
        <p>Avec un bail notarié, en cas d'impayés de loyer, vous pouvez directement :</p>
        <ul>
          <li>Procéder à une saisie sur salaire</li>
          <li>Saisir les comptes bancaires</li>
          <li>Mettre en place une procédure d'expulsion</li>
        </ul>
        
        <h3>Économies de temps et d'argent</h3>
        <p>Les économies réalisées sur les procédures judiciaires peuvent largement compenser le surcoût initial du bail notarié.</p>
        
        <h2>Comparaison avec le bail classique</h2>
        <p>Un bail sous seing privé nécessite une procédure judiciaire complète en cas de litige, ce qui peut prendre plusieurs mois et engendrer des frais importants.</p>
        
        <h2>Conclusion</h2>
        <p>La force exécutoire fait du bail notarié un outil de protection puissant pour les propriétaires.</p>
      `,
      metaTitle: "Force exécutoire : l'avantage majeur du bail notarié",
      metaDescription: "Comprendre la force exécutoire du bail notarié et ses implications concrètes en cas de litige locatif.",
      metaKeywords: "bail notarié, force exécutoire, propriétaire, locataire, notaire",
      imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=400&fit=crop",
      ogImage: "https://www.bailnotarie.fr/og-cover-v2.png",
    },
    {
      title: "Bail notarié vs bail classique : analyse comparative",
      description: "Comparaison détaillée entre le bail notarié et le bail sous seing privé pour vous aider à faire le bon choix.",
      content: `
        <h2>Bail sous seing privé : simplicité et coût</h2>
        <p>Le bail sous seing privé reste la solution la plus courante. Il présente l'avantage d'être simple à mettre en place et moins coûteux. Cependant, en cas de litige, il nécessite une procédure judiciaire complète.</p>
        
        <h2>Bail notarié : sécurité et efficacité</h2>
        <p>Le bail notarié offre :</p>
        <ul>
          <li>Une force exécutoire immédiate</li>
          <li>Une sécurité juridique renforcée</li>
          <li>Des délais d'expulsion réduits</li>
          <li>Une protection maximale du propriétaire</li>
        </ul>
        
        <h2>Comparaison des coûts</h2>
        <table>
          <tr>
            <th>Type de bail</th>
            <th>Coût initial</th>
            <th>Coût en cas de litige</th>
          </tr>
          <tr>
            <td>Bail classique</td>
            <td>Faible</td>
            <td>Élevé (procédure judiciaire)</td>
          </tr>
          <tr>
            <td>Bail notarié</td>
            <td>Modéré</td>
            <td>Faible (force exécutoire)</td>
          </tr>
        </table>
        
        <h2>Quand choisir le bail notarié ?</h2>
        <p>Le bail notarié est particulièrement recommandé pour :</p>
        <ul>
          <li>Les biens de valeur</li>
          <li>Les locataires à profil risqué</li>
          <li>Les propriétaires souhaitant une sécurité maximale</li>
        </ul>
        
        <h2>Conclusion</h2>
        <p>Le choix dépend de votre situation et de votre appétence au risque. Pour une sécurité maximale, le bail notarié reste le choix le plus judicieux.</p>
      `,
      metaTitle: "Bail notarié vs bail classique : analyse comparative",
      metaDescription: "Comparaison détaillée entre le bail notarié et le bail sous seing privé pour vous aider à faire le bon choix.",
      metaKeywords: "bail notarié, bail classique, analyse comparative, propriétaire, locataire, notaire",
      imageUrl: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&h=400&fit=crop",
      ogImage: "https://www.bailnotarie.fr/og-cover-v2.png",
    },
    {
      title: "Les obligations légales dans un bail notarié",
      description: "Découvrez les obligations légales spécifiques au bail notarié et comment elles protègent propriétaire et locataire.",
      content: `
        <h2>Obligations du propriétaire</h2>
        <h3>Obligations de délivrance</h3>
        <p>Le propriétaire doit délivrer un logement décent, conforme aux critères de décence définis par la loi. Le notaire vérifie que ces obligations sont clairement stipulées dans le contrat.</p>
        
        <h3>Obligations d'entretien</h3>
        <p>Les obligations d'entretien et de réparation sont précisées dans le bail notarié, offrant une sécurité juridique pour les deux parties.</p>
        
        <h2>Obligations du locataire</h2>
        <h3>Paiement du loyer</h3>
        <p>Le locataire s'engage à payer le loyer et les charges dans les délais prévus. La force exécutoire du bail notarié permet un recouvrement rapide en cas de défaut.</p>
        
        <h3>Entretien et usage paisible</h3>
        <p>Le locataire doit entretenir le logement et en faire un usage paisible, sans trouble de voisinage.</p>
        
        <h2>Rôle du notaire</h2>
        <p>Le notaire s'assure que :</p>
        <ul>
          <li>Toutes les clauses sont conformes à la loi</li>
          <li>Les obligations sont équilibrées</li>
          <li>Les droits de chaque partie sont respectés</li>
        </ul>
        
        <h2>Avantages de la sécurité juridique</h2>
        <p>Cette validation par un professionnel du droit réduit considérablement les risques de litige et offre une base solide en cas de conflit.</p>
        
        <h2>Conclusion</h2>
        <p>Le bail notarié garantit une sécurité juridique optimale pour toutes les parties impliquées.</p>
      `,
      metaTitle: "Les obligations légales dans un bail notarié",
      metaDescription: "Découvrez les obligations légales spécifiques au bail notarié et comment elles protègent propriétaire et locataire.",
      metaKeywords: "bail notarié, obligations légales, propriétaire, locataire, notaire",
      imageUrl: "https://images.pexels.com/photos/5668858/pexels-photo-5668858.jpeg?auto=compress&cs=tinysrgb&w=1200",
      ogImage: "https://www.bailnotarie.fr/og-cover-v2.png",
    },
  ]

  // Créer les articles
  for (const articleData of articles) {
    const slug = generateSlug(articleData.title)
    
    const article = await prisma.article.upsert({
      where: { slug },
      update: {
        title: articleData.title,
        description: articleData.description,
        content: articleData.content,
        categoryId: category.id,
        metaTitle: articleData.metaTitle,
        metaDescription: articleData.metaDescription,
        metaKeywords: articleData.metaKeywords,
        imageUrl: articleData.imageUrl,
        ogImage: articleData.ogImage,
      },
      create: {
        title: articleData.title,
        slug,
        description: articleData.description,
        content: articleData.content,
        categoryId: category.id,
        metaTitle: articleData.metaTitle,
        metaDescription: articleData.metaDescription,
        metaKeywords: articleData.metaKeywords,
        imageUrl: articleData.imageUrl,
        ogImage: articleData.ogImage,
      },
    })

    console.log('✅ Article créé:', article.title)
  }

  console.log('🎉 Seeding terminé avec succès!')
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
