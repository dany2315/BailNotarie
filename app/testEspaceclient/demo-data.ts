/* Jeu de données de démonstration pour la maquette `/testEspaceclient`.

   Volontairement « chargé » : un dossier signé, un chez le notaire, un sans
   locataire, un brouillon, un intake en cours et un message du notaire. C'est
   le seul moyen de juger une mise en page — une page à un seul dossier ne dit
   rien de ce qui se passe quand tout arrive en même temps. */

const now = new Date();
const iso = (monthsFromNow: number) => {
  const date = new Date(now);
  date.setMonth(date.getMonth() + monthsFromNow);
  return date.toISOString();
};

export const DEMO_USER_NAME = "Camille Fabre";
export const DEMO_OWNER_ID = "demo-owner";

const PARIS = {
  id: "prop-paris",
  label: "Appartement Rivoli",
  fullAddress: "12 rue de Rivoli, 75004 Paris",
};

const LYON = {
  id: "prop-lyon",
  label: "Studio Vitton",
  fullAddress: "8 cours Vitton, 69006 Lyon",
};

const BORDEAUX = {
  id: "prop-bordeaux",
  label: "Maison Chartrons",
  fullAddress: "24 rue Notre-Dame, 33000 Bordeaux",
};

const BASTILLE = {
  id: "prop-bastille",
  label: "Studio Bastille",
  fullAddress: "5 rue de la Roquette, 75011 Paris",
};

const LOCAL_COMMERCIAL = {
  id: "prop-commerce",
  label: "Local Sainte-Catherine",
  fullAddress: "3 rue Sainte-Catherine, 33000 Bordeaux",
};

const tenantPerson = (firstName: string, lastName: string, email: string) => ({
  id: `party-${email}`,
  profilType: "LOCATAIRE",
  persons: [{ firstName, lastName, email }],
  entreprise: null,
});

const ownerParty = {
  id: "party-owner",
  profilType: "PROPRIETAIRE",
  persons: [{ firstName: "Camille", lastName: "Fabre", email: "camille.fabre@example.com" }],
  entreprise: null,
};

/* ---------- Tableau de bord ------------------------------------------------ */

export const DEMO_BAUX = [
  {
    id: "bail-lyon",
    bailType: "BAIL_MEUBLE_1_ANS",
    bailFamily: "HABITATION",
    status: "CLIENT_CONTACTED",
    rentAmount: 780,
    effectiveDate: iso(1),
    endDate: null,
    property: LYON,
    parties: [ownerParty, tenantPerson("Maxime", "Bonnet", "maxime.bonnet@example.com")],
    dossierAssignments: [
      { id: "assign-1", notaire: { id: "not-1", name: "Me Laurent", email: "me.laurent@example.fr" } },
    ],
  },
  {
    id: "bail-paris",
    bailType: "BAIL_NU_3_ANS",
    bailFamily: "HABITATION",
    status: "AWAITING_TENANT",
    rentAmount: 1450,
    effectiveDate: iso(2),
    endDate: null,
    property: PARIS,
    parties: [ownerParty],
    dossierAssignments: [],
  },
  {
    id: "bail-commerce",
    bailFamily: "COMMERCIAL",
    bailType: null,
    status: "PENDING_VALIDATION",
    rentAmount: 2100,
    effectiveDate: iso(1),
    endDate: null,
    property: LOCAL_COMMERCIAL,
    parties: [
      ownerParty,
      {
        id: "party-entreprise",
        profilType: "LOCATAIRE",
        persons: [],
        entreprise: { legalName: "Atelier Sainte-Catherine SAS", name: "Atelier SC", email: "contact@atelier-sc.fr" },
      },
    ],
    dossierAssignments: [],
  },
  {
    id: "bail-bordeaux",
    bailType: "BAIL_NU_3_ANS",
    bailFamily: "HABITATION",
    status: "SIGNED",
    rentAmount: 1180,
    effectiveDate: iso(-8),
    endDate: iso(28),
    property: BORDEAUX,
    parties: [ownerParty, tenantPerson("Inès", "Marchand", "ines.marchand@example.com")],
    dossierAssignments: [
      { id: "assign-2", notaire: { id: "not-2", name: "Me Vidal", email: "me.vidal@example.fr" } },
    ],
  },
] as any;

export const DEMO_PENDING_REQUESTS = [
  {
    id: "req-1",
    title: "Justificatif de propriété à renvoyer",
    content: "Le document transmis est illisible sur la deuxième page. Pouvez-vous le renvoyer ?",
    createdAt: now.toISOString(),
    bail: { id: "bail-lyon", property: LYON },
  },
] as any;

export const DEMO_ACTIVE_INTAKES = [
  {
    token: "intake-token-demo",
    target: "PROPRIETAIRE",
    intakeUrl: "/intakes/intake-token-demo",
    stage: "property" as const,
    description: "Surface et diagnostics du bien",
    propertyLabel: "Appartement Rivoli",
    bailType: "BAIL_NU_3_ANS",
  },
] as any;

export const DEMO_BAIL_DRAFTS = [
  {
    id: "draft-1",
    bailType: "BAIL_MEUBLE_9_MOIS",
    rentAmount: 0,
    effectiveDate: iso(2),
    updatedAt: now.toISOString(),
    property: BORDEAUX,
    parties: [ownerParty, tenantPerson("Sofia", "Nguyen", "sofia.nguyen@example.com")],
  },
] as any;

/* ---------- Mes dossiers -------------------------------------------------- */

export const DEMO_BIENS = [
  {
    ...PARIS,
    status: "ACTIVE",
    completionStatus: "COMPLETED",
    surfaceM2: 58,
    type: "APPARTEMENT",
    createdAt: iso(-6),
    updatedAt: now.toISOString(),
    bails: [
      {
        id: "bail-paris",
        status: "AWAITING_TENANT",
        effectiveDate: iso(2),
        endDate: null,
        rentAmount: 1450,
        bailType: "BAIL_NU_3_ANS",
        bailFamily: "HABITATION",
        paidAt: now.toISOString(),
        parties: [ownerParty],
        dossierAssignments: [],
        intakes: [],
      },
      {
        id: "bail-paris-ancien",
        status: "TERMINATED",
        effectiveDate: iso(-38),
        endDate: iso(-2),
        rentAmount: 1280,
        bailType: "BAIL_NU_3_ANS",
        bailFamily: "HABITATION",
        paidAt: iso(-38),
        parties: [ownerParty, tenantPerson("Julien", "Roche", "julien.roche@example.com")],
        dossierAssignments: [
          { id: "assign-3", notaire: { id: "not-2", name: "Me Vidal", email: "me.vidal@example.fr" } },
        ],
        intakes: [],
      },
      {
        id: "bail-paris-classe",
        status: "CLASSE_SANS_SUITE",
        effectiveDate: iso(-6),
        endDate: null,
        rentAmount: 1400,
        bailType: "BAIL_MEUBLE_1_ANS",
        bailFamily: "HABITATION",
        paidAt: iso(-6),
        parties: [ownerParty, tenantPerson("Léa", "Dumont", "lea.dumont@example.com")],
        dossierAssignments: [],
        intakes: [],
      },
    ],
  },
  {
    ...LYON,
    status: "ACTIVE",
    completionStatus: "PENDING_CHECK",
    surfaceM2: 24,
    type: "APPARTEMENT",
    createdAt: iso(-3),
    updatedAt: now.toISOString(),
    bails: [
      {
        id: "bail-lyon",
        status: "CLIENT_CONTACTED",
        effectiveDate: iso(1),
        endDate: null,
        rentAmount: 780,
        bailType: "BAIL_MEUBLE_1_ANS",
        bailFamily: "HABITATION",
        paidAt: now.toISOString(),
        parties: [ownerParty, tenantPerson("Maxime", "Bonnet", "maxime.bonnet@example.com")],
        dossierAssignments: [
          { id: "assign-1", notaire: { id: "not-1", name: "Me Laurent", email: "me.laurent@example.fr" } },
        ],
        intakes: [],
      },
      {
        id: "bail-lyon-ancien",
        status: "TERMINATED",
        effectiveDate: iso(-13),
        endDate: iso(-1),
        rentAmount: 720,
        bailType: "BAIL_MEUBLE_1_ANS",
        bailFamily: "HABITATION",
        paidAt: iso(-13),
        parties: [ownerParty, tenantPerson("Nora", "Belkacem", "nora.belkacem@example.com")],
        dossierAssignments: [],
        intakes: [],
      },
    ],
  },
  {
    ...BORDEAUX,
    status: "ACTIVE",
    // Son bail est signé : le bien a donc été validé en amont — un bail ne
    // part chez le notaire que si le propriétaire, le locataire et le bien
    // sont tous COMPLETED.
    completionStatus: "COMPLETED",
    surfaceM2: 96,
    type: "MAISON",
    createdAt: iso(-12),
    updatedAt: now.toISOString(),
    bails: [
      {
        id: "bail-bordeaux",
        status: "SIGNED",
        effectiveDate: iso(-8),
        endDate: iso(28),
        rentAmount: 1180,
        bailType: "BAIL_NU_3_ANS",
        bailFamily: "HABITATION",
        paidAt: iso(-8),
        parties: [ownerParty, tenantPerson("Inès", "Marchand", "ines.marchand@example.com")],
        dossierAssignments: [
          { id: "assign-2", notaire: { id: "not-2", name: "Me Vidal", email: "me.vidal@example.fr" } },
        ],
        intakes: [],
      },
    ],
  },
  {
    ...LOCAL_COMMERCIAL,
    status: "ACTIVE",
    completionStatus: "NOT_STARTED",
    surfaceM2: 42,
    type: "LOCAL_COMMERCIAL",
    createdAt: iso(-1),
    updatedAt: now.toISOString(),
    bails: [
      {
        id: "bail-commerce-draft",
        status: "DRAFT",
        effectiveDate: iso(1),
        endDate: null,
        rentAmount: 0,
        bailType: null,
        bailFamily: "COMMERCIAL",
        paidAt: null,
        parties: [ownerParty],
        dossierAssignments: [],
        intakes: [{ id: "intake-1", token: "intake-token-demo", status: "OPEN" }],
      },
    ],
  },
  {
    ...BASTILLE,
    status: "ACTIVE",
    completionStatus: "PARTIAL",
    surfaceM2: 19,
    type: "APPARTEMENT",
    createdAt: iso(-1),
    updatedAt: now.toISOString(),
    bails: [],
  },
] as any;

export const DEMO_LOCATAIRES = [
  {
    id: "tenant-1",
    persons: [{ firstName: "Maxime", lastName: "Bonnet", email: "maxime.bonnet@example.com" }],
    entreprise: null,
  },
  {
    id: "tenant-2",
    persons: [{ firstName: "Inès", lastName: "Marchand", email: "ines.marchand@example.com" }],
    entreprise: null,
  },
] as any;

/* ---------- Mes informations --------------------------------------------- */

export const DEMO_PERSONS = [
  {
    id: "person-1",
    firstName: "Camille",
    lastName: "Fabre",
    profession: "Architecte",
    familyStatus: "MARIE",
    matrimonialRegime: "COMMUNAUTE_REDUITE",
    birthPlace: "Nantes (44)",
    birthDate: "1984-03-17T00:00:00.000Z",
    email: "camille.fabre@example.com",
    phone: "06 12 34 56 78",
    fullAddress: "9 rue des Lilas, 44000 Nantes",
    nationality: "Française",
    isPrimary: true,
    documents: [
      {
        id: "doc-1",
        kind: "PIECE_IDENTITE",
        fileKey: "demo/piece-identite.pdf",
        mimeType: "application/pdf",
        label: "Carte d'identité",
        createdAt: iso(-5),
      },
      {
        id: "doc-2",
        kind: "JUSTIFICATIF_DOMICILE",
        fileKey: "demo/justificatif-domicile.pdf",
        mimeType: "application/pdf",
        label: "Justificatif de domicile",
        createdAt: iso(-5),
      },
    ],
  },
  {
    id: "person-2",
    firstName: "Julien",
    lastName: "Fabre",
    profession: "Ingénieur",
    familyStatus: "MARIE",
    matrimonialRegime: "COMMUNAUTE_REDUITE",
    birthPlace: "Rennes (35)",
    birthDate: "1982-11-02T00:00:00.000Z",
    email: "julien.fabre@example.com",
    phone: "06 98 76 54 32",
    fullAddress: "9 rue des Lilas, 44000 Nantes",
    nationality: "Française",
    isPrimary: false,
    documents: [
      {
        id: "doc-3",
        kind: "PIECE_IDENTITE",
        fileKey: "demo/piece-identite-2.pdf",
        mimeType: "application/pdf",
        label: "Passeport",
        createdAt: iso(-5),
      },
    ],
  },
] as any;

export const DEMO_CLIENT_DOCUMENTS = [] as any;

/* ---------- Espace locataire --------------------------------------------- */

/* Vu de l'autre côté du bail : c'est le propriétaire qui est nommé, et le
   locataire n'a rien à créer — il suit, complète quand on le lui demande, et
   parle à son notaire. */

const ownerPartyForTenant = {
  id: "party-owner-2",
  profilType: "PROPRIETAIRE",
  persons: [{ firstName: "Camille", lastName: "Fabre", email: "camille.fabre@example.com" }],
  entreprise: null,
};

const tenantSelf = {
  id: "party-self",
  profilType: "LOCATAIRE",
  persons: [{ firstName: "Maxime", lastName: "Bonnet", email: "maxime.bonnet@example.com" }],
  entreprise: null,
};

export const DEMO_TENANT_NAME = "Maxime Bonnet";

export const DEMO_TENANT_BAUX = [
  {
    id: "t-bail-lyon",
    bailType: "BAIL_MEUBLE_1_ANS",
    bailFamily: "HABITATION",
    status: "CLIENT_CONTACTED",
    rentAmount: 780,
    effectiveDate: iso(1),
    endDate: null,
    property: LYON,
    parties: [ownerPartyForTenant, tenantSelf],
    dossierAssignments: [
      { id: "t-assign-1", notaire: { id: "not-1", name: "Me Laurent", email: "me.laurent@example.fr" } },
    ],
  },
  {
    id: "t-bail-form",
    bailType: "BAIL_NU_3_ANS",
    bailFamily: "HABITATION",
    status: "AWAITING_TENANT_FORM",
    rentAmount: 1450,
    effectiveDate: iso(2),
    endDate: null,
    property: PARIS,
    parties: [ownerPartyForTenant, tenantSelf],
    dossierAssignments: [],
  },
  {
    id: "t-bail-ancien",
    bailType: "BAIL_MEUBLE_1_ANS",
    bailFamily: "HABITATION",
    status: "TERMINATED",
    rentAmount: 690,
    effectiveDate: iso(-25),
    endDate: iso(-1),
    property: BORDEAUX,
    parties: [ownerPartyForTenant, tenantSelf],
    dossierAssignments: [
      { id: "t-assign-2", notaire: { id: "not-2", name: "Me Vidal", email: "me.vidal@example.fr" } },
    ],
  },
] as any;

export const DEMO_TENANT_REQUESTS = [
  {
    id: "t-req-1",
    title: "Pièce d'identité à renvoyer",
    content: "Le scan est coupé en bas. Pouvez-vous le reprendre en entier ?",
    createdAt: now.toISOString(),
    bail: { id: "t-bail-lyon", property: LYON },
  },
] as any;

export const DEMO_TENANT_INTAKE = {
  token: "t-intake-token",
  intakeUrl: "/intakes/t-intake-token",
  stage: "identity" as const,
  description: "Vos informations personnelles",
  propertyLabel: "Appartement Rivoli",
  bailType: "BAIL_NU_3_ANS",
  bailId: "t-bail-form",
} as any;

export const DEMO_TENANT_PERSONS = [
  {
    id: "t-person-1",
    firstName: "Maxime",
    lastName: "Bonnet",
    profession: "Développeur",
    familyStatus: "CELIBATAIRE",
    matrimonialRegime: null,
    birthPlace: "Lyon (69)",
    birthDate: "1994-06-21T00:00:00.000Z",
    email: "maxime.bonnet@example.com",
    phone: "06 45 78 12 909",
    fullAddress: "8 cours Vitton, 69006 Lyon",
    nationality: "Française",
    isPrimary: true,
    documents: [
      {
        id: "t-doc-1",
        kind: "PIECE_IDENTITE",
        fileKey: "demo/t-piece-identite.pdf",
        mimeType: "application/pdf",
        label: "Carte d'identité",
        createdAt: iso(-2),
      },
    ],
  },
] as any;
