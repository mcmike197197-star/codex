// ==================================
// IWF CRM v9 — Clients module
// ==================================
(function(){
  const STORAGE_KEY = 'iwf_crm_v9_clients';
  const CAND_KEY = 'iwf_crm_v9_candidates';
  const USER_PROFILE_KEY = 'iwf_crm_v9_profile';
  const mainContent = document.getElementById('main-content');
  const nav = document.querySelector('.nav');

  const CITY_COORDS = {
    'București': { lat: 44.4268, lng: 26.1025 },
    'Cluj-Napoca': { lat: 46.7712, lng: 23.6236 },
    'Iași': { lat: 47.1585, lng: 27.6014 },
    'Brașov': { lat: 45.6579, lng: 25.6012 },
    'Constanța': { lat: 44.1733, lng: 28.6383 },
    'Timișoara': { lat: 45.7489, lng: 21.2087 },
    'Sibiu': { lat: 45.7928, lng: 24.1521 },
    'Oradea': { lat: 47.0722, lng: 21.9211 },
    'Ploiești': { lat: 44.946, lng: 26.036 },
    'Arad': { lat: 46.1866, lng: 21.3123 },
    'Galați': { lat: 45.4353, lng: 28.0079 },
    'Craiova': { lat: 44.3302, lng: 23.7949 },
    'Pitești': { lat: 44.8565, lng: 24.8692 },
    'Bacău': { lat: 46.5672, lng: 26.9138 },
    'Suceava': { lat: 47.6514, lng: 26.2559 }
  };

  function extractCollection(raw, fallback = []) {
    if (!raw) return fallback;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw.clients)) return raw.clients;
    if (Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw.list)) return raw.list;
    if (Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw.records)) return raw.records;
    if (typeof raw === 'object') {
      const nested = Object.values(raw)
        .filter((value) => Array.isArray(value) && value.length)
        .flat();
      if (nested.length) return nested;
    }
    return fallback;
  }

  function load(k){ try{return JSON.parse(localStorage.getItem(k)||'null');}catch(e){return null;} }
  function save(k,v){ localStorage.setItem(k,JSON.stringify(v)); }
  function getActiveUser(){
    let user = load(USER_PROFILE_KEY);
    if(!user){
      user = {
        id: 'user-demo',
        name: 'Manager demo',
        role: 'Account Executive',
        email: 'manager.demo@iwf2030.ro',
        initials: 'MD',
        avatarColor: '#4f46e5'
      };
      save(USER_PROFILE_KEY, user);
    }
    return user;
  }
  const activeUser = getActiveUser();
  const ACCOUNT_MANAGERS = [
    { id: activeUser.id, name: activeUser.name, role: activeUser.role, email: activeUser.email },
    { id: 'user-ana', name: 'Ana Pop', role: 'Client Partner', email: 'ana.pop@iwf2030.ro' },
    { id: 'user-george', name: 'George Matei', role: 'Recruitment Lead', email: 'george.matei@iwf2030.ro' },
    { id: 'user-irina', name: 'Irina Drăghici', role: 'Regional Manager', email: 'irina.draghici@iwf2030.ro' }
  ];

  // Load data
  const storedClientsRaw = load(STORAGE_KEY);
  const storedClients = extractCollection(storedClientsRaw) || [];
  const hasStoredClients = Array.isArray(storedClients) && storedClients.length > 0;
  const initialClients = hasStoredClients ? storedClients : seedClients();
  let dbClients = initialClients.map(normalizeClient);
  const storedCandidatesRaw = load(CAND_KEY);
  const candidateCollection = storedCandidatesRaw?.candidates ? storedCandidatesRaw.candidates : storedCandidatesRaw;
  let dbCandidates = extractCollection(candidateCollection) || [];
  const listState = {
    search: '',
    priority: 'all',
    manager: 'all',
    industry: 'all'
  };

  function geocode(city){
    if(!city) return { lat: 45.9432, lng: 24.9668 }; // centru RO
    return CITY_COORDS[city] || { lat: 45.9432, lng: 24.9668 };
  }

  function parseServices(raw){
    if(!raw) return [];
    if(Array.isArray(raw)){
      return raw.map(item => typeof item === 'string' ? item.trim() : item?.name || '').filter(Boolean);
    }
    if(typeof raw === 'string'){
      return raw.split(/[,;\n]/).map(part => part.trim()).filter(Boolean);
    }
    return [];
  }

  function normalizeTask(task, owner){
    if(!task) return null;
    const now = new Date().toISOString();
    const dueSource = task.dueAt || task.dueDate || task.due || now;
    const dueAt = dueSource.includes('T') ? dueSource : `${dueSource}T${task.dueTime || '09:00'}`;
    const statusFlow = ['Planificat','În lucru','Finalizat'];
    const status = statusFlow.includes(task.status) ? task.status : 'Planificat';
    return {
      id: task.id || 'task-'+shortId(),
      title: task.title || 'Follow-up client',
      category: task.category || 'Follow-up',
      owner: task.owner || owner?.name || activeUser.name,
      dueAt,
      dueDate: task.dueDate || dueAt.split('T')[0],
      dueTime: task.dueTime || dueAt.split('T')[1]?.slice(0,5) || '',
      status,
      notes: task.notes || ''
    };
  }

  function normalizeClient(raw, idx){
    const owner = raw?.owner || { id: activeUser.id, name: activeUser.name, role: activeUser.role, email: activeUser.email };
    const baseCity = raw?.city || raw?.location?.city || raw?.locations?.[0]?.city || 'București';
    const baseCoords = geocode(baseCity);
    const now = new Date().toISOString();
    const onboarding = raw?.onboardingDate || raw?.createdAt || now;
    const services = parseServices(raw?.services);
    const locations = (raw?.locations || []).map(loc => normalizeLocation(loc));
    if(!locations.length){
      locations.push(normalizeLocation({
        id: 'loc-'+shortId(),
        label: `Sediu ${baseCity}`,
        address: raw?.address || `Centru ${baseCity}`,
        city: baseCity,
        county: raw?.county || '',
        lat: baseCoords.lat,
        lng: baseCoords.lng
      }));
    }
    return {
      id: raw?.id || `client-${idx || shortId()}`,
      name: raw?.name || `Client ${idx || ''}`.trim(),
      country: raw?.country || 'România',
      city: baseCity,
      address: raw?.address || locations[0]?.address || '',
      phone: raw?.phone || '',
      companyPhone: raw?.companyPhone || raw?.phone || '',
      vat: raw?.vat || raw?.cui || '',
      industry: raw?.industry || 'General',
      website: raw?.website || '',
      size: raw?.size || raw?.headcount || '',
      paymentTerms: raw?.paymentTerms || '30 zile',
      registrationNumber: raw?.registrationNumber || raw?.registration || '',
      billingEmail: raw?.billingEmail || raw?.finance?.billingEmail || raw?.contact?.email || '',
      billingAddress: raw?.billingAddress || raw?.finance?.billingAddress || raw?.address || '',
      notes: raw?.notes || '',
      owner,
      createdAt: raw?.createdAt || now,
      updatedAt: raw?.updatedAt || now,
      onboardingDate: onboarding,
      accountStatus: raw?.accountStatus || 'Activ',
      priority: raw?.priority || 'Strategic',
      riskLevel: raw?.riskLevel || 'Scăzut',
      services: services.length ? services : ['Recrutare permanentă'],
      accountTeam: Array.isArray(raw?.accountTeam) && raw.accountTeam.length ? raw.accountTeam : [owner],
      tags: raw?.tags || [],
      contact: {
        name: raw?.contact?.name || '',
        role: raw?.contact?.role || '',
        email: raw?.contact?.email || '',
        phone: raw?.contact?.phone || ''
      },
      locations,
      projects: (raw?.projects || []).map(normalizeProject),
      proposed: raw?.proposed || [],
      placements: raw?.placements || [],
      tasks: (raw?.tasks || []).map(task => normalizeTask(task, owner)).filter(Boolean),
      activities: (raw?.activities || []).map(evt => ({
        id: evt?.id || 'act-'+shortId(),
        when: evt?.when || now,
        who: evt?.who || owner.name,
        note: evt?.note || ''
      }))
    };
  }

  function normalizeLocation(loc){
    if(!loc) return null;
    const coords = geocode(loc.city);
    return {
      id: loc.id || 'loc-'+shortId(),
      label: loc.label || `${loc.city || 'Punct'} Office`,
      address: loc.address || '',
      city: loc.city || 'București',
      county: loc.county || '',
      lat: typeof loc.lat === 'number' ? loc.lat : coords.lat,
      lng: typeof loc.lng === 'number' ? loc.lng : coords.lng,
      activeRoles: loc.activeRoles || []
    };
  }

  function normalizeProject(p){
    if(!p) return null;
    return {
      id: p.id || 'proj-'+shortId(),
      title: p.title || p.role || 'Rol nou',
      locationId: p.locationId || (p.location ? null : null),
      location: p.location || '',
      openings: typeof p.openings === 'number' ? p.openings : (p.headcount || 1),
      fee: p.fee || '15%',
      projectValue: typeof p.projectValue === 'number' ? p.projectValue : (parseFloat(p.projectValue) || 0),
      contractType: p.contractType || 'Permanent',
      status: p.status || 'Deschis',
      openedAt: p.openedAt || new Date().toISOString(),
      tags: p.tags || [],
      notes: p.notes || ''
    };
  }

  function seedClients(){
    const demoOwner = { id: activeUser.id, name: activeUser.name, role: activeUser.role, email: activeUser.email };
    return [
      {
        id: 'client-1',
        name: 'TransLogistic SRL',
        country: 'România',
        city: 'București',
        address: 'Bulevardul Timișoara 50, București',
        phone: '+40 31 400 2000',
        vat: 'RO12345678',
        registrationNumber: 'J40/12345/2010',
        industry: 'Logistică & Transport',
        website: 'https://translogistic.ro',
        size: '250-500 angajați',
        paymentTerms: '30 zile',
        billingEmail: 'finance@translogistic.ro',
        billingAddress: 'Bulevardul Timișoara 50, București',
        services: ['Recrutare permanentă','Leasing de personal','Training introductiv'],
        accountStatus: 'Activ',
        priority: 'Strategic',
        riskLevel: 'Mediu',
        onboardingDate: '2023-09-01T08:00:00.000Z',
        contact: {
          name: 'Irina Marinescu',
          role: 'HR Director',
          email: 'irina.marinescu@translogistic.ro',
          phone: '+40 723 120 120'
        },
        owner: demoOwner,
        locations: [
          {
            id: 'loc-buc',
            label: 'Hub Logistic București',
            address: 'Șoseaua de Centură 12, Chitila',
            city: 'București',
            county: 'Ilfov',
            lat: 44.51,
            lng: 25.95,
            activeRoles: ['Operator depozit','Manager tură']
          },
          {
            id: 'loc-ph',
            label: 'Platformă Ploiești',
            address: 'Parcul Industrial Ploiești, DN1B',
            city: 'Ploiești',
            county: 'Prahova',
            lat: 44.95,
            lng: 26.04,
            activeRoles: ['Șofer CE','Tehnician mentenanță']
          }
        ],
        projects: [
          {
            id: 'proj-operator',
            title: 'Operator depozit 3 schimburi',
            location: 'Hub Logistic București',
            openings: 18,
            fee: '15%',
            projectValue: 48000,
            contractType: 'Permanent',
            status: 'Deschis',
            openedAt: '2024-05-02T08:00:00.000Z',
            tags: ['Logistică','Noapte'],
            notes: 'Se acordă training 2 săptămâni la angajare.'
          },
          {
            id: 'proj-sofer',
            title: 'Șofer CE distribuție retail',
            location: 'Platformă Ploiești',
            openings: 6,
            fee: '18%',
            projectValue: 72000,
            contractType: 'Permanent',
            status: 'Interviu',
            openedAt: '2024-04-15T08:00:00.000Z',
            tags: ['Transport'],
            notes: 'Necesită atestat ADR.'
          }
        ],
        proposed: [
          { id: 'prop-1', name: 'Cristian Dobre', title: 'Șofer CE', stage: 'Interviu' },
          { id: 'prop-2', name: 'Oana Varga', title: 'Manager tură', stage: 'Propus' }
        ],
        placements: [
          { id: 'pl-1', name: 'Ion Iliescu', title: 'Operator depozit', startDate: '2024-05-20' }
        ],
        tasks: [
          { title: 'Revizuiește contractul cadru', category: 'Contract', dueDate: '2024-07-01', dueTime: '10:00', status: 'Planificat', owner: 'Manager demo' },
          { title: 'Organizează vizită pe platformă', category: 'Vizită', dueDate: '2024-07-05', dueTime: '14:00', status: 'În lucru', owner: 'Ana Pop' }
        ],
        activities: [
          {
            id: 'act-1',
            when: '2024-06-10T09:00:00.000Z',
            who: 'Manager demo',
            note: 'Review lunar KPI livrări finalize.'
          },
          {
            id: 'act-2',
            when: '2024-05-29T14:00:00.000Z',
            who: 'Manager demo',
            note: 'Feedback pozitiv pentru candidații propuși.'
          }
        ]
      },
      {
        id: 'client-2',
        name: 'TechWorks România',
        country: 'România',
        city: 'Cluj-Napoca',
        address: 'Strada Fabricii 101, Cluj-Napoca',
        phone: '+40 364 890 123',
        vat: 'RO34567890',
        registrationNumber: 'J12/4521/2014',
        industry: 'Tehnologie & Software',
        website: 'https://techworks.ro',
        size: '500-1000 angajați',
        paymentTerms: '45 zile',
        billingEmail: 'finance@techworks.ro',
        billingAddress: 'Strada Fabricii 101, Cluj-Napoca',
        services: ['Recrutare permanentă','Executive search','Consultanță talent'],
        accountStatus: 'Activ',
        priority: 'Strategic',
        riskLevel: 'Scăzut',
        onboardingDate: '2022-11-10T08:00:00.000Z',
        contact: {
          name: 'Mihai Ionescu',
          role: 'Talent Acquisition Lead',
          email: 'mihai.ionescu@techworks.ro',
          phone: '+40 723 210 987'
        },
        owner: demoOwner,
        locations: [
          {
            id: 'loc-cj',
            label: 'Sediu central Cluj',
            address: 'Strada Fabricii 101, Cluj-Napoca',
            city: 'Cluj-Napoca',
            county: 'Cluj',
            lat: 46.785,
            lng: 23.66,
            activeRoles: ['Inginer software','Product Owner']
          },
          {
            id: 'loc-bh',
            label: 'Birou Oradea',
            address: 'Calea Aradului 10, Oradea',
            city: 'Oradea',
            county: 'Bihor',
            lat: 47.0722,
            lng: 21.9211,
            activeRoles: ['QA Engineer']
          }
        ],
        projects: [
          {
            id: 'proj-devops',
            title: 'Senior DevOps Engineer',
            location: 'Sediu central Cluj',
            openings: 2,
            fee: '20%',
            projectValue: 36000,
            contractType: 'Permanent',
            status: 'Ofertă',
            openedAt: '2024-03-12T08:00:00.000Z',
            tags: ['Cloud','Kubernetes'],
            notes: 'Experiență AWS, Azure, on-call o dată la 6 săptămâni.'
          },
          {
            id: 'proj-ui',
            title: 'UI/UX Designer mid-level',
            location: 'Birou Oradea',
            openings: 1,
            fee: '18%',
            projectValue: 15000,
            contractType: 'Contract proiect 12 luni',
            status: 'Deschis',
            openedAt: '2024-06-01T08:00:00.000Z',
            tags: ['Design','Figma'],
            notes: 'Necesită prezență fizică 3 zile/săptămână.'
          }
        ],
        proposed: [
          { id: 'prop-3', name: 'Alexandru Pavel', title: 'DevOps Engineer', stage: 'Ofertă' }
        ],
        placements: [
          { id: 'pl-2', name: 'Cristina Fodor', title: 'Product Owner', startDate: '2024-04-01' }
        ],
        tasks: [
          { title: 'Confirma workshop EVP', category: 'Workshop', dueDate: '2024-06-28', dueTime: '16:00', status: 'În lucru', owner: 'George Matei' },
          { title: 'Trimite shortlist UI/UX', category: 'Livrare', dueDate: '2024-06-24', dueTime: '12:00', status: 'Planificat', owner: 'Manager demo' }
        ],
        activities: [
          {
            id: 'act-3',
            when: '2024-06-05T11:30:00.000Z',
            who: 'Manager demo',
            note: 'Prezentare shortlist DevOps (4 candidați).'
          }
        ]
      },
      {
        id: 'client-3',
        name: 'MedicaLine',
        country: 'România',
        city: 'Iași',
        address: 'Strada Palat 5A, Iași',
        phone: '+40 332 909 550',
        vat: 'RO67890123',
        registrationNumber: 'J22/2040/2016',
        industry: 'Servicii medicale',
        website: 'https://medicaline.ro',
        size: '100-250 angajați',
        paymentTerms: '60 zile',
        billingEmail: 'contabilitate@medicaline.ro',
        billingAddress: 'Strada Palat 5A, Iași',
        services: ['Recrutare permanentă','Leasing personal medical'],
        accountStatus: 'Activ',
        priority: 'Standard',
        riskLevel: 'Scăzut',
        onboardingDate: '2023-03-15T08:00:00.000Z',
        contact: {
          name: 'Ioana Dima',
          role: 'Director Resurse Umane',
          email: 'ioana.dima@medicaline.ro',
          phone: '+40 741 555 333'
        },
        owner: demoOwner,
        locations: [
          {
            id: 'loc-iasi',
            label: 'Clinică centrală Iași',
            address: 'Strada Palat 5A, Iași',
            city: 'Iași',
            county: 'Iași',
            lat: 47.1585,
            lng: 27.6014,
            activeRoles: ['Asistent medical','Registrator']
          },
          {
            id: 'loc-bc',
            label: 'Policlinică Bacău',
            address: 'Strada 9 Mai 45, Bacău',
            city: 'Bacău',
            county: 'Bacău',
            lat: 46.5672,
            lng: 26.9138,
            activeRoles: ['Medic specialist','Asistent laborator']
          }
        ],
        projects: [
          {
            id: 'proj-asistent',
            title: 'Asistent medical generalist',
            location: 'Clinică centrală Iași',
            openings: 4,
            fee: '12%',
            projectValue: 24000,
            contractType: 'Permanent',
            status: 'Interviu',
            openedAt: '2024-04-28T08:00:00.000Z',
            tags: ['Medical'],
            notes: 'Se oferă relocare pentru candidații din alte județe.'
          },
          {
            id: 'proj-registrator',
            title: 'Registrator medical',
            location: 'Policlinică Bacău',
            openings: 3,
            fee: '10%',
            projectValue: 9000,
            contractType: 'Permanent',
            status: 'Deschis',
            openedAt: '2024-06-12T08:00:00.000Z',
            tags: ['Front-office'],
            notes: 'Program în ture, weekend-uri prin rotație.'
          }
        ],
        proposed: [
          { id: 'prop-4', name: 'Roxana Bălan', title: 'Asistent medical', stage: 'Interviu' },
          { id: 'prop-5', name: 'Lavinia Petrescu', title: 'Registrator', stage: 'Propus' }
        ],
        placements: [],
        tasks: [
          { title: 'Trimite referințe medicale', category: 'Documente', dueDate: '2024-06-26', dueTime: '09:30', status: 'Planificat', owner: 'Manager demo' },
          { title: 'Confirmă training onboarding', category: 'Onboarding', dueDate: '2024-06-30', dueTime: '15:00', status: 'Planificat', owner: 'Irina Drăghici' }
        ],
        activities: []
      },
      {
        id: 'client-4',
        name: 'GreenBuild Construct',
        country: 'România',
        city: 'Brașov',
        address: 'Strada Zaharia Stancu 8, Brașov',
        phone: '+40 368 400 880',
        vat: 'RO90234561',
        registrationNumber: 'J08/2211/2012',
        industry: 'Construcții & Proiecte industriale',
        website: 'https://greenbuild.ro',
        size: '300-600 angajați',
        paymentTerms: '30 zile',
        billingEmail: 'billing@greenbuild.ro',
        billingAddress: 'Strada Zaharia Stancu 8, Brașov',
        services: ['Recrutare permanentă','Leasing specialiști proiect'],
        accountStatus: 'Activ',
        priority: 'Strategic',
        riskLevel: 'Ridicat',
        onboardingDate: '2024-01-05T08:00:00.000Z',
        contact: {
          name: 'Adrian Călugăr',
          role: 'Director Resurse Umane',
          email: 'adrian.calugar@greenbuild.ro',
          phone: '+40 745 220 456'
        },
        owner: demoOwner,
        locations: [
          {
            id: 'loc-bv',
            label: 'Șantier Tractorul',
            address: 'Strada Zaharia Stancu 8, Brașov',
            city: 'Brașov',
            county: 'Brașov',
            lat: 45.6669,
            lng: 25.6057,
            activeRoles: ['Inginer șantier','Responsabil SSM']
          },
          {
            id: 'loc-sb',
            label: 'Parc Industrial Sibiu',
            address: 'Șoseaua Alba Iulia 120, Sibiu',
            city: 'Sibiu',
            county: 'Sibiu',
            lat: 45.7928,
            lng: 24.1521,
            activeRoles: ['Manager proiect','Tehnician instalații']
          }
        ],
        projects: [
          {
            id: 'proj-ssm',
            title: 'Responsabil SSM șantier industrial',
            location: 'Șantier Tractorul',
            openings: 2,
            fee: '14%',
            projectValue: 18000,
            contractType: 'Contract proiect 18 luni',
            status: 'Interviu',
            openedAt: '2024-05-18T08:00:00.000Z',
            tags: ['Construcții','SSM'],
            notes: 'Obligatoriu curs SSM nivel 3.'
          },
          {
            id: 'proj-manager',
            title: 'Manager proiect industrial',
            location: 'Parc Industrial Sibiu',
            openings: 1,
            fee: '22%',
            projectValue: 54000,
            contractType: 'Permanent',
            status: 'Propus',
            openedAt: '2024-04-02T08:00:00.000Z',
            tags: ['Management','Construcții'],
            notes: 'Experiență minimă 7 ani pe proiecte industriale.'
          }
        ],
        proposed: [
          { id: 'prop-6', name: 'Marius Gănescu', title: 'Manager proiect', stage: 'Propus' },
          { id: 'prop-7', name: 'Raluca Bratu', title: 'Responsabil SSM', stage: 'Interviu' }
        ],
        placements: [],
        tasks: [
          { title: 'Actualizează planul de recrutare Sibiu', category: 'Planificare', dueDate: '2024-06-27', dueTime: '11:00', status: 'În lucru', owner: 'Irina Drăghici' },
          { title: 'Trimite raport risc Q2', category: 'Raportare', dueDate: '2024-06-30', dueTime: '17:00', status: 'Planificat', owner: 'Manager demo' }
        ],
        activities: []
      },
      {
        id: 'client-5',
        name: 'RetailNova Group',
        country: 'România',
        city: 'Constanța',
        address: 'Bulevardul Tomis 500, Constanța',
        phone: '+40 341 902 450',
        vat: 'RO55670921',
        registrationNumber: 'J13/3101/2018',
        industry: 'Retail & E-commerce',
        website: 'https://retailnova.ro',
        size: '1000-1500 angajați',
        paymentTerms: '45 zile',
        billingEmail: 'ap@retailnova.ro',
        billingAddress: 'Bulevardul Tomis 500, Constanța',
        services: ['Recrutare volum','Training onboarding','Consultanță employer branding'],
        accountStatus: 'Activ',
        priority: 'Strategic',
        riskLevel: 'Scăzut',
        onboardingDate: '2024-02-14T08:00:00.000Z',
        contact: {
          name: 'Anca Tudor',
          role: 'Head of Talent Acquisition',
          email: 'anca.tudor@retailnova.ro',
          phone: '+40 741 990 442'
        },
        owner: demoOwner,
        locations: [
          {
            id: 'loc-ct',
            label: 'Centru logistic Constanța',
            address: 'Bulevardul Tomis 500, Constanța',
            city: 'Constanța',
            county: 'Constanța',
            lat: 44.1733,
            lng: 28.6383,
            activeRoles: ['Operator picking','Team leader']
          },
          {
            id: 'loc-buc-retail',
            label: 'Flagship București',
            address: 'Calea Victoriei 120, București',
            city: 'București',
            county: 'București',
            lat: 44.4396,
            lng: 26.0963,
            activeRoles: ['Store manager','Visual merchandiser']
          }
        ],
        projects: [
          {
            id: 'proj-operator-retail',
            title: 'Operator logistic depozit mare volum',
            location: 'Centru logistic Constanța',
            openings: 25,
            fee: '12%',
            projectValue: 50000,
            contractType: 'Permanent',
            status: 'Deschis',
            openedAt: '2024-05-30T08:00:00.000Z',
            tags: ['Retail','Logistică'],
            notes: 'Program în 3 schimburi, bonus de performanță trimestrial.'
          },
          {
            id: 'proj-store-manager',
            title: 'Store Manager Flagship',
            location: 'Flagship București',
            openings: 1,
            fee: '18%',
            projectValue: 28000,
            contractType: 'Permanent',
            status: 'Ofertă',
            openedAt: '2024-04-20T08:00:00.000Z',
            tags: ['Retail','Management'],
            notes: 'Cerută experiență minimă 5 ani pe magazine flagship.'
          }
        ],
        proposed: [
          { id: 'prop-8', name: 'Andreea Moraru', title: 'Store Manager', stage: 'Ofertă' },
          { id: 'prop-9', name: 'Florin Iacob', title: 'Operator logistică', stage: 'Propus' }
        ],
        placements: [
          { id: 'pl-3', name: 'Mihaela Neagu', title: 'Team leader logistică', startDate: '2024-05-15' }
        ],
        tasks: [
          { title: 'Planifică campanie recrutare sezon estival', category: 'Marketing', dueDate: '2024-07-03', dueTime: '13:00', status: 'Planificat', owner: 'Ana Pop' },
          { title: 'Confirma training vizual merchandising', category: 'Training', dueDate: '2024-06-29', dueTime: '10:30', status: 'În lucru', owner: 'Manager demo' }
        ],
        activities: []
      },
      {
        id: 'client-6',
        name: 'DataForge Analytics',
        country: 'România',
        city: 'Timișoara',
        address: 'Strada Take Ionescu 45, Timișoara',
        phone: '+40 356 100 870',
        vat: 'RO77881234',
        registrationNumber: 'J35/1890/2019',
        industry: 'Data Science & AI',
        website: 'https://dataforge.ai',
        size: '80-150 angajați',
        paymentTerms: '30 zile',
        billingEmail: 'accounts@dataforge.ai',
        billingAddress: 'Strada Take Ionescu 45, Timișoara',
        services: ['Recrutare permanentă','Consultanță salarizare','Talent Intelligence'],
        accountStatus: 'Activ',
        priority: 'Strategic',
        riskLevel: 'Scăzut',
        onboardingDate: '2023-07-22T08:00:00.000Z',
        contact: {
          name: 'Sorin Luca',
          role: 'Head of People',
          email: 'sorin.luca@dataforge.ai',
          phone: '+40 746 300 221'
        },
        owner: demoOwner,
        locations: [
          {
            id: 'loc-tm',
            label: 'Innovation Hub Timișoara',
            address: 'Strada Take Ionescu 45, Timișoara',
            city: 'Timișoara',
            county: 'Timiș',
            lat: 45.7489,
            lng: 21.2087,
            activeRoles: ['Data Scientist','Machine Learning Engineer']
          },
          {
            id: 'loc-buc-ai',
            label: 'AI Studio București',
            address: 'Splaiul Independenței 294, București',
            city: 'București',
            county: 'București',
            lat: 44.435,
            lng: 26.05,
            activeRoles: ['Consultant AI','Analist date']
          }
        ],
        projects: [
          {
            id: 'proj-ml',
            title: 'Machine Learning Engineer Computer Vision',
            location: 'Innovation Hub Timișoara',
            openings: 3,
            fee: '22%',
            projectValue: 90000,
            contractType: 'Permanent',
            status: 'Interviu',
            openedAt: '2024-05-10T08:00:00.000Z',
            tags: ['AI','Computer Vision'],
            notes: 'Stack: Python, PyTorch, MLOps cu MLFlow.'
          },
          {
            id: 'proj-consultant',
            title: 'Consultant AI Enterprise',
            location: 'AI Studio București',
            openings: 2,
            fee: '25%',
            projectValue: 80000,
            contractType: 'Permanent',
            status: 'Deschis',
            openedAt: '2024-06-08T08:00:00.000Z',
            tags: ['AI','Consultanță'],
            notes: 'Necesită disponibilitate pentru deplasări 30%.'
          }
        ],
        proposed: [
          { id: 'prop-10', name: 'Bianca Mureșan', title: 'Data Scientist', stage: 'Interviu' }
        ],
        placements: [
          { id: 'pl-4', name: 'Dan Horia', title: 'ML Engineer', startDate: '2024-03-18' }
        ],
        tasks: [
          { title: 'Pregătește raport salary benchmarking', category: 'Research', dueDate: '2024-07-02', dueTime: '09:00', status: 'Planificat', owner: 'George Matei' },
          { title: 'Setează workshop AI Studio', category: 'Workshop', dueDate: '2024-07-04', dueTime: '15:00', status: 'În lucru', owner: 'Manager demo' }
        ],
        activities: []
      }
    ];
  }

  // Attach nav click
  nav.addEventListener('click', e=>{
    const btn=e.target.closest('button[data-view="clients"]');
    if(!btn) return;
    schedule(renderList);
  });

  // ---------- Helpers ----------
  function fmtDate(d, opts={}){
    const dd=new Date(d);
    if(isNaN(dd))return d||'';
    return dd.toLocaleDateString('ro-RO', Object.assign({ day:'2-digit', month:'short', year:'numeric' }, opts));
  }
  function fmtTime(d){
    const dd=new Date(d);
    if(isNaN(dd))return '';
    return dd.toLocaleTimeString('ro-RO', { hour:'2-digit', minute:'2-digit' });
  }
  function shortId(){ return Math.random().toString(36).substring(2,8); }
  function debounce(fn, wait=200){
    let t;
    return (...args)=>{
      clearTimeout(t);
      t=setTimeout(()=>fn(...args),wait);
    };
  }
  function formatCurrency(v){
    if(!v) return '0 RON';
    return new Intl.NumberFormat('ro-RO',{style:'currency',currency:'RON',maximumFractionDigits:0}).format(v);
  }
  function formatNumber(v){
    return new Intl.NumberFormat('ro-RO').format(v || 0);
  }
  function sumProjectsValue(cl){
    return (cl.projects||[]).reduce((acc,p)=>acc+(p.projectValue||0),0);
  }
  function totalOpenings(cl){
    return (cl.projects||[]).reduce((acc,p)=>acc+(p.openings||0),0);
  }
  function parseCity(location){
    if(!location) return null;
    return location.split(',')[0].trim();
  }
  function distanceKm(lat1,lng1,lat2,lng2){
    const toRad = deg => deg * Math.PI / 180;
    const R = 6371;
    const dLat = toRad(lat2-lat1);
    const dLng = toRad(lng2-lng1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
  }

  // ---------- Main list ----------
  function renderList(){
    const totalClients = dbClients.length;
    const totalProjects = dbClients.reduce((acc, cl) => acc + (cl.projects?.length||0), 0);
    const openPositions = dbClients.reduce((acc, cl) => acc + totalOpenings(cl), 0);
    const portfolioValue = dbClients.reduce((acc, cl) => acc + sumProjectsValue(cl), 0);
    const avgSla = 28;

    const managers = ACCOUNT_MANAGERS;
    const industries = Array.from(new Set(dbClients.map(cl=>cl.industry))).sort();
    const priorities = Array.from(new Set(dbClients.map(cl=>cl.priority || 'Standard')));

    const filteredClients = dbClients.filter(cl=>{
      const search = listState.search.trim().toLowerCase();
      if(search){
        const haystack = [cl.name, cl.industry, cl.city, cl.contact?.name, cl.owner?.name, cl.accountStatus, cl.priority]
          .join(' ')
          .toLowerCase();
        if(!haystack.includes(search)) return false;
      }
      if(listState.priority !== 'all' && cl.priority !== listState.priority) return false;
      if(listState.manager !== 'all' && cl.owner?.id !== listState.manager) return false;
      if(listState.industry !== 'all' && cl.industry !== listState.industry) return false;
      return true;
    }).sort((a,b)=>a.name.localeCompare(b.name));

    const rows = filteredClients.map(cl=>{
      const city = cl.city || cl.locations?.[0]?.city || '—';
      const projects = cl.projects?.length || 0;
      const owner = cl.owner?.name || '—';
      const services = (cl.services || []).slice(0,3).map(service=>`<span class="badge soft">${service}</span>`).join(' ');
      const statusClass = (cl.accountStatus || 'activ').toLowerCase().replace(/[^a-z0-9]+/gi,'-');
      return `
        <tr>
          <td>
            <strong>${cl.name}</strong>
            <div class="muted" style="font-size:12px;">${cl.industry}</div>
            <div class="muted" style="font-size:12px;">${services || ''}</div>
          </td>
          <td>${city}</td>
          <td>
            ${cl.contact.name || '—'}
            <div class="muted" style="font-size:12px;">${cl.contact.email || ''}</div>
          </td>
          <td>${projects}</td>
          <td>${owner}</td>
          <td>
            <span class="status-pill status-${statusClass}">${cl.accountStatus || 'Activ'}</span>
            <div class="muted" style="font-size:12px;">Prioritate: ${cl.priority || 'Standard'}</div>
          </td>
          <td>
            <span class="badge">${formatNumber(totalOpenings(cl))} poziții</span>
            <div class="muted" style="font-size:12px;">${formatCurrency(sumProjectsValue(cl))}</div>
          </td>
          <td><button class="btn ghost" data-open="${cl.id}">Deschide</button></td>
        </tr>`;
    }).join('');

    const tableRows = rows || `<tr><td colspan="8" style="text-align:center;padding:24px;" class="muted">Niciun client nu se potrivește cu filtrele curente. Ajustează căutarea pentru a vizualiza portofoliul.</td></tr>`;

    mainContent.innerHTML=`
      <div class="card">
        <div class="flex-between" style="flex-wrap:wrap;gap:14px;">
          <div>
            <h2 style="margin:0;">Clienți activi</h2>
            <p class="muted" style="margin:6px 0 0;">Portofoliu global, pipeline și management operațional</p>
          </div>
          <button class="btn" id="add_client"><i data-lucide="plus"></i> Client nou</button>
        </div>
        <div class="stats-grid" style="margin-top:18px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));">
          <div class="stat-card">
            <span>Total clienți</span>
            <strong>${totalClients}</strong>
            <small class="muted">Rețea activă în România</small>
          </div>
          <div class="stat-card">
            <span>Proiecte active</span>
            <strong>${totalProjects}</strong>
            <small class="muted">${formatNumber(openPositions)} poziții deschise</small>
          </div>
          <div class="stat-card">
            <span>Valoare pipeline</span>
            <strong>${formatCurrency(portfolioValue)}</strong>
            <small class="muted">Fee-uri și proiecte în derulare</small>
          </div>
          <div class="stat-card">
            <span>SLA mediu plasare</span>
            <strong>${avgSla} zile</strong>
            <small class="muted">Ultimele 30 de plasări</small>
          </div>
        </div>
        <div class="glass-card filter-bar" style="margin-top:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;align-items:end;">
          <label class="muted" style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;">
            Căutare globală
            <input id="client_search" class="input" type="search" placeholder="Nume client, oraș, manager" value="${listState.search}">
          </label>
          <label class="muted" style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;">
            Prioritate
            <select id="filter_priority" class="input">
              <option value="all" ${listState.priority==='all'?'selected':''}>Toate</option>
              ${priorities.map(opt=>`<option value="${opt}" ${listState.priority===opt?'selected':''}>${opt}</option>`).join('')}
            </select>
          </label>
          <label class="muted" style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;">
            Manager cont
            <select id="filter_manager" class="input">
              <option value="all" ${listState.manager==='all'?'selected':''}>Toți managerii</option>
              ${managers.map(m=>`<option value="${m.id}" ${listState.manager===m.id?'selected':''}>${m.name}</option>`).join('')}
            </select>
          </label>
          <label class="muted" style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;">
            Industrie
            <select id="filter_industry" class="input">
              <option value="all" ${listState.industry==='all'?'selected':''}>Toate industriile</option>
              ${industries.map(ind=>`<option value="${ind}" ${listState.industry===ind?'selected':''}>${ind}</option>`).join('')}
            </select>
          </label>
        </div>
        <div class="table-responsive" style="margin-top:22px;">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Oraș</th>
                <th>Contact principal</th>
                <th>Proiecte</th>
                <th>Manager cont</th>
                <th>Stare</th>
                <th>Pipeline</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </div>
    `;
    mainContent.querySelectorAll('[data-open]').forEach(b=>{
      b.addEventListener('click',()=>openClient(b.dataset.open));
    });
    document.getElementById('add_client').addEventListener('click',createClient);
    document.getElementById('client_search').addEventListener('input', debounce(e=>{ listState.search = e.target.value; renderList(); }, 200));
    document.getElementById('filter_priority').addEventListener('change', e=>{ listState.priority = e.target.value; renderList(); });
    document.getElementById('filter_manager').addEventListener('change', e=>{ listState.manager = e.target.value; renderList(); });
    document.getElementById('filter_industry').addEventListener('change', e=>{ listState.industry = e.target.value; renderList(); });
    if (window.lucide) { lucide.createIcons(); }
  }

  // ---------- Add client ----------
  function createClient(){
    const cityOptions = Object.keys(CITY_COORDS).sort();
    mainContent.innerHTML=`
      <div class="card">
        <button class="btn ghost" id="back"><i data-lucide="arrow-left"></i> Înapoi</button>
      </div>
      <div class="card">
        <h2>Client nou</h2>
        <p class="muted">Completează profilul companiei cu toate detaliile necesare pentru gestiunea recrutărilor.</p>
        <div class="grid-two" style="margin-top:20px;gap:20px;">
          <div>
            <label>Nume companie <span class="required">*</span>
              <input id="cl_name" class="input" placeholder="Ex: TransLogistic SRL" required>
            </label>
            <label>Domeniu activitate
              <input id="cl_industry" class="input" placeholder="Ex: Logistică & Transport">
            </label>
            <label>Website companie
              <input id="cl_website" class="input" placeholder="https://">
            </label>
            <label>Număr angajați
              <input id="cl_size" class="input" placeholder="Ex: 250-500">
            </label>
            <label>Telefon companie
              <input id="cl_phone" class="input" placeholder="Ex: +40 31 400 2000">
            </label>
            <label>Termene plată
              <input id="cl_terms" class="input" placeholder="Ex: 30 zile">
            </label>
            <label>Servicii contractate
              <textarea id="cl_services" class="input" rows="2" placeholder="Ex: Recrutare permanentă, Leasing personal"></textarea>
            </label>
            <label>Notițe generale
              <textarea id="cl_notes" class="input" rows="3" placeholder="Strategie, SLA, elemente de context"></textarea>
            </label>
          </div>
          <div>
            <label>Țară
              <input id="cl_country" class="input" value="România">
            </label>
            <label>Oraș principal <span class="required">*</span>
              <select id="cl_city" class="input">
                ${cityOptions.map(city=>`<option value="${city}">${city}</option>`).join('')}
              </select>
            </label>
            <label>Adresă sediu <span class="required">*</span>
              <input id="cl_address" class="input" placeholder="Stradă, număr, județ" required>
            </label>
            <label>CUI / VAT
              <input id="cl_vat" class="input" placeholder="RO00000000">
            </label>
            <label>Număr Registrul Comerțului
              <input id="cl_registration" class="input" placeholder="Ex: J40/1234/2020">
            </label>
            <label>Persoană contact <span class="required">*</span>
              <input id="cl_person" class="input" placeholder="Nume și prenume" required>
            </label>
            <label>Rol persoană contact
              <input id="cl_person_role" class="input" placeholder="Ex: HR Director">
            </label>
            <label>Email contact <span class="required">*</span>
              <input id="cl_email" class="input" type="email" placeholder="contact@companie.ro" required>
            </label>
            <label>Telefon contact
              <input id="cl_person_phone" class="input" placeholder="Ex: +40 7xx xxx xxx">
            </label>
            <label>Email facturare
              <input id="cl_billing_email" class="input" type="email" placeholder="finance@companie.ro">
            </label>
            <label>Adresă facturare
              <input id="cl_billing_address" class="input" placeholder="Adresă completă facturare">
            </label>
            <div class="grid-inline" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;">
              <label class="muted" style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;">Prioritate
                <select id="cl_priority" class="input">
                  <option value="Strategic">Strategic</option>
                  <option value="Standard">Standard</option>
                  <option value="Operațional">Operațional</option>
                </select>
              </label>
              <label class="muted" style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;">Status relație
                <select id="cl_status" class="input">
                  <option value="Activ">Activ</option>
                  <option value="În onboarding">În onboarding</option>
                  <option value="În risc">În risc</option>
                  <option value="Suspendat">Suspendat</option>
                </select>
              </label>
              <label class="muted" style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;">Nivel risc
                <select id="cl_risk" class="input">
                  <option value="Scăzut">Scăzut</option>
                  <option value="Mediu">Mediu</option>
                  <option value="Ridicat">Ridicat</option>
                </select>
              </label>
            </div>
          </div>
        </div>
        <div class="glass-card" style="margin-top:24px;">
          <h3 style="margin-top:0;">Management cont</h3>
          <p class="muted">Acest client va fi inițial gestionat de <strong>${activeUser.name}</strong> (${activeUser.role}).</p>
        </div>
        <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap;">
          <button class="btn" id="save_client"><i data-lucide="save"></i> Salvează clientul</button>
          <button class="btn ghost" id="reset_form"><i data-lucide="rotate-ccw"></i> Resetează</button>
        </div>
      </div>
    `;

    document.getElementById('back').addEventListener('click',renderList);
    document.getElementById('reset_form').addEventListener('click',()=>createClient());
    document.getElementById('save_client').addEventListener('click',()=>{
      const name = document.getElementById('cl_name').value.trim();
      const country = document.getElementById('cl_country').value.trim() || 'România';
      const city = document.getElementById('cl_city').value;
      const address = document.getElementById('cl_address').value.trim();
      const contactName = document.getElementById('cl_person').value.trim();
      const contactEmail = document.getElementById('cl_email').value.trim();

      if(!name || !city || !address || !contactName || !contactEmail){
        alert('Completează câmpurile obligatorii: nume companie, oraș, adresă, persoană de contact și email.');
        return;
      }

      const servicesRaw = document.getElementById('cl_services').value.trim();
      const services = parseServices(servicesRaw);
      const billingEmail = document.getElementById('cl_billing_email').value.trim() || contactEmail;
      const billingAddress = document.getElementById('cl_billing_address').value.trim() || address;
      const onboardingDate = new Date().toISOString();

      const client = normalizeClient({
        id: 'client-'+shortId(),
        name,
        country,
        city,
        address,
        phone: document.getElementById('cl_phone').value.trim(),
        vat: document.getElementById('cl_vat').value.trim(),
        registrationNumber: document.getElementById('cl_registration').value.trim(),
        industry: document.getElementById('cl_industry').value.trim() || 'General',
        website: document.getElementById('cl_website').value.trim(),
        size: document.getElementById('cl_size').value.trim(),
        paymentTerms: document.getElementById('cl_terms').value.trim() || '30 zile',
        notes: document.getElementById('cl_notes').value.trim(),
        services,
        billingEmail,
        billingAddress,
        accountStatus: document.getElementById('cl_status').value,
        priority: document.getElementById('cl_priority').value,
        riskLevel: document.getElementById('cl_risk').value,
        onboardingDate,
        owner: { id: activeUser.id, name: activeUser.name, role: activeUser.role, email: activeUser.email },
        contact: {
          name: contactName,
          role: document.getElementById('cl_person_role').value.trim(),
          email: contactEmail,
          phone: document.getElementById('cl_person_phone').value.trim()
        },
        locations: [
          {
            id: 'loc-'+shortId(),
            label: `Sediu ${city}`,
            address,
            city,
            county: '',
            activeRoles: []
          }
        ],
        projects: [],
        proposed: [],
        tasks: [
          { title: 'Planifică ședința de kickoff', category: 'Kickoff', dueDate: onboardingDate.split('T')[0], dueTime: '10:00', status: 'Planificat', owner: activeUser.name },
          { title: 'Colectează documentele contractuale', category: 'Contract', dueDate: onboardingDate.split('T')[0], dueTime: '16:00', status: 'Planificat', owner: activeUser.name }
        ],
        placements: [],
        activities: [
          { id: 'act-'+shortId(), when: new Date().toISOString(), who: activeUser.name, note: 'Client creat din aplicație.' }
        ]
      });

      dbClients.unshift(client);
      save(STORAGE_KEY, dbClients);
      alert('Client adăugat în portofoliu.');
      renderList();
    });
    if (window.lucide) { lucide.createIcons(); }
  }

  // ---------- Open client ----------
  function openClient(id){
    const cl=dbClients.find(x=>x.id===id);
    if(!cl){renderList();return;}

    const state={
      matchRadius: 50,
      matchSkill: '',
      matchLocation: cl.locations?.[0]?.id || null
    };

    draw();

    function draw(){
      mainContent.innerHTML = clientViewTemplate(cl, state);

      document.getElementById('back_list').addEventListener('click',renderList);
      document.getElementById('edit_client').addEventListener('click',()=>editClient(cl));
      document.getElementById('add_project').addEventListener('click',()=>addProject(cl));
      document.getElementById('add_location').addEventListener('click',()=>addLocation(cl));
      document.getElementById('export_client').addEventListener('click',()=>exportClient(cl));
      document.getElementById('add_prop').addEventListener('click',()=>addProposed(cl));

      const ownerSelect = document.getElementById('owner_select');
      ownerSelect?.addEventListener('change',()=>{
        const selected = ACCOUNT_MANAGERS.find(m=>m.id===ownerSelect.value);
        if(selected){
          cl.owner = Object.assign({}, selected);
          cl.updatedAt = new Date().toISOString();
          save(STORAGE_KEY, dbClients);
          draw();
        }
      });

      document.getElementById('add_activity').addEventListener('click',()=>{
        const note = document.getElementById('new_activity').value.trim();
        if(!note){ alert('Adaugă text pentru notiță.'); return; }
        cl.activities.unshift({ id: 'act-'+shortId(), when: new Date().toISOString(), who: activeUser.name, note });
        document.getElementById('new_activity').value='';
        cl.updatedAt = new Date().toISOString();
        save(STORAGE_KEY, dbClients);
        draw();
      });

      const radius = document.getElementById('match_radius');
      const skill = document.getElementById('match_skill');
      const locationSel = document.getElementById('match_location');

      const bindCandidateButtons = () => {
        document.querySelectorAll('[data-open-candidate]').forEach(btn=>{
          btn.addEventListener('click',()=>{
            const candId = btn.dataset.openCandidate;
            if(window.IWF_CANDIDATES?.openProfile){
              window.IWF_CANDIDATES.openProfile(candId);
            }else{
              alert('Deschide secțiunea de candidați pentru detalii.');
            }
          });
        });
      };

      bindCandidateButtons();

      const bindTaskBoard = () => {
        const addBtn = document.getElementById('create_task');
        const titleInput = document.getElementById('task_title');
        const dateInput = document.getElementById('task_date');
        const timeInput = document.getElementById('task_time');
        const categoryInput = document.getElementById('task_category');
        const ownerInput = document.getElementById('task_owner');
        const notesInput = document.getElementById('task_notes');

        if(addBtn){
          addBtn.addEventListener('click',()=>{
            const title = titleInput.value.trim();
            const date = dateInput.value;
            const time = timeInput.value || '09:00';
            const category = categoryInput.value;
            const ownerId = ownerInput.value;
            const ownerProfile = ACCOUNT_MANAGERS.find(m=>m.id===ownerId) || activeUser;
            const notes = notesInput.value.trim();
            if(!title || !date){
              alert('Completează titlul și data pentru task.');
              return;
            }
            const task = normalizeTask({
              title,
              dueDate: date,
              dueTime: time,
              category,
              owner: ownerProfile.name,
              status: 'Planificat',
              notes
            }, ownerProfile);
            cl.tasks = cl.tasks || [];
            cl.tasks.push(task);
            cl.updatedAt = new Date().toISOString();
            save(STORAGE_KEY, dbClients);
            draw();
          });
        }

        document.querySelectorAll('[data-task-status]').forEach(btn=>{
          btn.addEventListener('click',()=>{
            const taskId = btn.dataset.taskStatus;
            const flow = ['Planificat','În lucru','Finalizat'];
            const task = cl.tasks.find(t=>t.id===taskId);
            if(!task) return;
            const idx = flow.indexOf(task.status);
            const next = flow[(idx+1) % flow.length];
            task.status = next;
            cl.updatedAt = new Date().toISOString();
            save(STORAGE_KEY, dbClients);
            draw();
          });
        });

        document.querySelectorAll('[data-task-delete]').forEach(btn=>{
          btn.addEventListener('click',()=>{
            const taskId = btn.dataset.taskDelete;
            cl.tasks = (cl.tasks || []).filter(t=>t.id!==taskId);
            cl.updatedAt = new Date().toISOString();
            save(STORAGE_KEY, dbClients);
            draw();
          });
        });
      };

      const updateMatch=()=>{
        state.matchRadius = parseInt(radius.value,10);
        state.matchSkill = skill.value.trim();
        state.matchLocation = locationSel.value;
        document.getElementById('match_results').innerHTML = renderCandidateMatches(cl, state);
        bindCandidateButtons();
        bindTaskBoard();
        if (window.lucide) { lucide.createIcons(); }
      };

      radius.addEventListener('change', updateMatch);
      skill.addEventListener('input', debounce(updateMatch, 250));
      locationSel.addEventListener('change', updateMatch);

      bindTaskBoard();

      if (window.lucide) { lucide.createIcons(); }
    }
  }

  function clientViewTemplate(cl, state){
    const ownerOptions = ACCOUNT_MANAGERS.map(m=>`<option value="${m.id}" ${cl.owner?.id===m.id?'selected':''}>${m.name} — ${m.role}</option>`).join('');
    const locationsOptions = cl.locations.map(loc=>`<option value="${loc.id}">${loc.label} (${loc.city})</option>`).join('');
    const firstContactLine = [cl.contact?.name, cl.contact?.role].filter(Boolean).join(' • ');
    const totalValue = formatCurrency(sumProjectsValue(cl));
    const openings = formatNumber(totalOpenings(cl));
    const proposed = cl.proposed?.length || 0;
    const placements = cl.placements?.length || 0;
    return `
      <div class="card" style="margin-bottom:16px;">
        <div class="flex-between" style="align-items:flex-start;gap:16px;flex-wrap:wrap;">
          <div style="max-width:520px;">
            <button class="btn ghost" id="back_list"><i data-lucide="arrow-left"></i> Înapoi la listă</button>
            <h2 style="margin:12px 0 4px;">${cl.name}</h2>
            <p class="muted" style="margin:0;">${cl.industry} • ${cl.city}, ${cl.country} • ${cl.website ? `<a href="${cl.website}" target="_blank">${cl.website}</a>` : 'Website necompletat'}</p>
            <p class="muted" style="margin:6px 0 0;">CUI: ${cl.vat || '—'} • Telefon: ${cl.phone || '—'} • Termene plată: ${cl.paymentTerms || '—'}</p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn" id="add_project"><i data-lucide="briefcase"></i> Proiect nou</button>
            <button class="btn" id="add_location"><i data-lucide="map-pin"></i> Locație nouă</button>
            <button class="btn" id="edit_client"><i data-lucide="pencil"></i> Editează profil</button>
            <button class="btn ghost" id="export_client"><i data-lucide="download"></i> Exportă raport</button>
          </div>
        </div>
        <div class="stats-grid" style="margin-top:20px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));">
          <div class="stat-card">
            <span>Proiecte curente</span>
            <strong>${cl.projects?.length || 0}</strong>
            <small class="muted">${openings} poziții în lucru</small>
          </div>
          <div class="stat-card">
            <span>Valoare pipeline</span>
            <strong>${totalValue}</strong>
            <small class="muted">Actualizat ${fmtDate(cl.updatedAt)}</small>
          </div>
          <div class="stat-card">
            <span>Propuneri & plasări</span>
            <strong>${proposed} / ${placements}</strong>
            <small class="muted">Candidați propuși • plasări confirmate</small>
          </div>
          <div class="stat-card">
            <span>Manager cont</span>
            <strong>${cl.owner?.name || 'Nealocat'}</strong>
            <small class="muted">${cl.owner?.role || ''}</small>
          </div>
        </div>
        ${renderOperationalPulse(cl)}
        <div class="glass-card" style="margin-top:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px;">
          <div>
            <h3 style="margin:0 0 6px;">Contact principal</h3>
            <p style="margin:0;">
              <strong>${firstContactLine || 'Necompletat'}</strong><br>
              <span class="muted">Email: ${cl.contact?.email || '—'}</span><br>
              <span class="muted">Telefon: ${cl.contact?.phone || '—'}</span>
            </p>
          </div>
          <div>
            <h3 style="margin:0 0 6px;">Management</h3>
            <label class="muted" style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;">Manager responsabil</label>
            <select id="owner_select" class="input" style="margin-top:6px;">${ownerOptions}</select>
            <p class="muted" style="margin:8px 0 0;">Contact: ${cl.owner?.email || '—'}</p>
          </div>
          <div>
            <h3 style="margin:0 0 6px;">Locație HQ</h3>
            <p style="margin:0;">
              <strong>${cl.address || 'Adresă necompletată'}</strong><br>
              <span class="muted">${cl.locations?.[0]?.label || ''}</span>
            </p>
          </div>
        </div>
        ${renderAccountIntelligence(cl)}
      </div>

      <div class="card">
        ${renderTaskBoard(cl)}
      </div>

      <div class="card">
        <h3 style="margin-top:0;">Portofoliu & oferte active</h3>
        ${renderPipelineSummary(cl)}
        ${renderProjectsTable(cl)}
      </div>

      <div class="card" style="display:grid;grid-template-columns:2fr 1fr;gap:24px;">
        <div>
          <h3 style="margin-top:0;">Harta locațiilor operaționale</h3>
          ${renderMap(cl)}
          <div class="locations-grid" style="margin-top:18px;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;">
            ${renderLocationsList(cl)}
          </div>
        </div>
        <div>
          <h3 style="margin-top:0;">Activități & notițe</h3>
          <div id="activity_timeline">${renderActivities(cl)}</div>
          <textarea id="new_activity" class="input" rows="3" placeholder="Notează întâlniri, feedback sau următorii pași"></textarea>
          <button class="btn" style="margin-top:8px;width:100%;" id="add_activity"><i data-lucide="plus"></i> Salvează notiță</button>
        </div>
      </div>

      <div class="card">
        ${renderCandidateMatchSection(cl, state, locationsOptions)}
      </div>

      <div class="card">
        <div class="flex-between" style="align-items:center;gap:12px;">
          <h3 style="margin:0;">Propuneri către client</h3>
          <button class="btn" id="add_prop"><i data-lucide="user-check"></i> Propune candidat</button>
        </div>
        <div id="prop_list" style="margin-top:16px;">${renderProposed(cl)}</div>
      </div>
    `;
  }

  function renderProjectsTable(cl){
    if(!cl.projects || !cl.projects.length){
      return `<div class="muted">Nu există proiecte active încă. Adaugă primul proiect pentru a urmări pozițiile deschise.</div>`;
    }
    return cl.projects.map(proj=>`
      <div class="glass-card" style="margin-bottom:12px;padding:16px;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:12px;align-items:center;">
        <div>
          <strong>${proj.title}</strong>
          <div class="muted" style="font-size:12px;">${proj.location || '—'} • ${proj.contractType || '—'}</div>
        </div>
        <div>
          <span class="muted" style="font-size:12px;">Poziții deschise</span>
          <div style="font-size:18px;font-weight:600;">${formatNumber(proj.openings || 0)}</div>
        </div>
        <div>
          <span class="muted" style="font-size:12px;">Fee</span>
          <div style="font-size:18px;font-weight:600;">${proj.fee || '—'}</div>
        </div>
        <div>
          <span class="muted" style="font-size:12px;">Valoare proiect</span>
          <div style="font-size:18px;font-weight:600;">${formatCurrency(proj.projectValue || 0)}</div>
          <div class="muted" style="font-size:12px;">${fmtDate(proj.openedAt)}</div>
        </div>
      </div>
    `).join('');
  }

  function renderLocationsList(cl){
    return cl.locations.map(loc=>`
      <div class="glass-card" style="padding:14px;">
        <strong>${loc.label}</strong>
        <div class="muted" style="font-size:12px;">${loc.address}</div>
        <div class="muted" style="font-size:12px;">${loc.city}${loc.county ? ', '+loc.county : ''}</div>
        ${loc.activeRoles?.length ? `<div class="badge" style="margin-top:6px;display:inline-block;">Roluri: ${loc.activeRoles.join(', ')}</div>` : ''}
      </div>
    `).join('');
  }

  function computePipelineSummary(cl){
    const summary = { Propus: 0, Interviu: 0, 'Ofertă': 0, Angajat: cl.placements?.length || 0, Respins: 0 };
    (cl.proposed || []).forEach(item => {
      const stage = item?.stage || 'Propus';
      if(summary[stage] === undefined){
        summary[stage] = 0;
      }
      summary[stage] += 1;
    });
    return summary;
  }

  function renderOperationalPulse(cl){
    const summary = computePipelineSummary(cl);
    const pipelineVolume = (summary.Propus || 0) + (summary.Interviu || 0) + (summary['Ofertă'] || 0);
    const servicesPreview = (cl.services || []).slice(0,2).join(', ') || 'Servicii necompletate';
    const onboarding = cl.onboardingDate || cl.createdAt;
    return `
      <div class="pulse-grid" style="margin-top:20px;">
        <div class="pulse-card">
          <span>Stare relație</span>
          <strong>${cl.accountStatus || 'Activ'}</strong>
          <small class="muted">${cl.priority || 'Standard'} • risc ${cl.riskLevel || 'Scăzut'}</small>
        </div>
        <div class="pulse-card">
          <span>Onboarding</span>
          <strong>${fmtDate(onboarding)}</strong>
          <small class="muted">Termene plată ${cl.paymentTerms || '—'}</small>
        </div>
        <div class="pulse-card">
          <span>Servicii active</span>
          <strong>${formatNumber((cl.services || []).length)}</strong>
          <small class="muted">${servicesPreview}</small>
        </div>
        <div class="pulse-card">
          <span>Pipeline candidați</span>
          <strong>${formatNumber(pipelineVolume)}</strong>
          <small class="muted">${formatNumber(summary.Angajat || 0)} angajări confirmate</small>
        </div>
      </div>
    `;
  }

  function renderAccountIntelligence(cl){
    const services = (cl.services || []).map(service => `<span class="badge soft">${service}</span>`).join(' ');
    const team = (cl.accountTeam || []).map(member => {
      if(typeof member === 'string') return `<span class="chip">${member}</span>`;
      return `<span class="chip">${member?.name || ''}</span>`;
    }).join('');
    return `
      <div class="glass-card account-intel" style="margin-top:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;">
        <div>
          <h3 style="margin:0 0 6px;">Informații fiscale</h3>
          <p style="margin:0;">
            <span class="muted">CUI</span><br><strong>${cl.vat || '—'}</strong><br>
            <span class="muted">Registrul Comerțului</span><br><strong>${cl.registrationNumber || '—'}</strong>
          </p>
          <p style="margin:12px 0 0;">
            <span class="muted">Email facturare</span><br><strong>${cl.billingEmail || '—'}</strong><br>
            <span class="muted">Adresă facturare</span><br><strong>${cl.billingAddress || '—'}</strong>
          </p>
        </div>
        <div>
          <h3 style="margin:0 0 6px;">Servicii & echipă</h3>
          <p style="margin:0;">${services || '<span class="muted">Adaugă serviciile contractate</span>'}</p>
          <p class="muted" style="margin:12px 0 4px;">Account team</p>
          <div class="tag-row">${team || '<span class="muted">Se va seta ulterior</span>'}</div>
          ${cl.notes ? `<p class="muted" style="margin:12px 0 0;">Notițe: ${cl.notes}</p>` : ''}
        </div>
      </div>
    `;
  }

  function renderPipelineSummary(cl){
    const summary = computePipelineSummary(cl);
    const cards = [
      { key: 'Propus', label: 'Propuși', icon: 'user-plus', accent: 'proposal' },
      { key: 'Interviu', label: 'În interviu', icon: 'messages-square', accent: 'interview' },
      { key: 'Ofertă', label: 'În ofertare', icon: 'file-signature', accent: 'offer' },
      { key: 'Angajat', label: 'Angajați', icon: 'user-check', accent: 'hire' },
      { key: 'Respins', label: 'Respinsi', icon: 'user-x', accent: 'rejected' }
    ];
    return `
      <div class="pipeline-grid">
        ${cards.map(card=>`
          <div class="pipeline-card accent-${card.accent}">
            <div class="pipeline-card__label"><i data-lucide="${card.icon}"></i>${card.label}</div>
            <div class="pipeline-card__value">${formatNumber(summary[card.key] || 0)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderTaskBoard(cl){
    const ownerOptions = ACCOUNT_MANAGERS.map(manager => `<option value="${manager.id}" ${manager.id===activeUser.id?'selected':''}>${manager.name}</option>`).join('');
    const defaultDate = new Date().toISOString().split('T')[0];
    return `
      <div class="task-board">
        <div class="task-board__intro">
          <h3 style="margin:0 0 4px;">Taskuri account management</h3>
          <p class="muted" style="margin:0;">Gestionează follow-up-uri, întâlniri și livrabile direct din profilul clientului.</p>
        </div>
        <div class="task-board__form">
          <label>Titlu task <span class="required">*</span>
            <input id="task_title" class="input" placeholder="Ex: Trimite oferta actualizată">
          </label>
          <div class="task-board__row">
            <label>Data <span class="required">*</span>
              <input id="task_date" class="input" type="date" value="${defaultDate}">
            </label>
            <label>Ora
              <input id="task_time" class="input" type="time" value="10:00">
            </label>
            <label>Categoria
              <select id="task_category" class="input">
                <option value="Follow-up">Follow-up</option>
                <option value="Întâlnire">Întâlnire</option>
                <option value="Contract">Contract</option>
                <option value="Raportare">Raportare</option>
                <option value="Onboarding">Onboarding</option>
                <option value="Vizită">Vizită</option>
                <option value="Workshop">Workshop</option>
              </select>
            </label>
            <label>Responsabil
              <select id="task_owner" class="input">${ownerOptions}</select>
            </label>
          </div>
          <label>Notițe
            <textarea id="task_notes" class="input" rows="2" placeholder="Context, obiective, participanți"></textarea>
          </label>
          <button class="btn" id="create_task"><i data-lucide="plus"></i> Adaugă task</button>
        </div>
        <div id="task_list" class="task-grid">
          ${renderTasks(cl)}
        </div>
      </div>
    `;
  }

  function renderTasks(cl){
    if(!cl.tasks || !cl.tasks.length){
      return `<div class="muted">Adaugă primele taskuri pentru a urmări follow-up-urile și livrabilele dedicate acestui client.</div>`;
    }
    const sorted = [...cl.tasks].sort((a,b)=>{
      const timeA = new Date(a.dueAt || `${a.dueDate}T${a.dueTime || '09:00'}`);
      const timeB = new Date(b.dueAt || `${b.dueDate}T${b.dueTime || '09:00'}`);
      return timeA - timeB;
    });
    return sorted.map(task=>{
      const statusClass = `status-pill status-${(task.status || '').toLowerCase().replace(/\s+/g,'-')}`;
      const dueDate = fmtDate(task.dueDate || task.dueAt);
      const dueTime = task.dueTime ? ` • ${task.dueTime}` : '';
      const statusCta = nextStatusCta(task.status);
      const notes = task.notes ? `<p class="muted" style="margin:8px 0 0;">${task.notes}</p>` : '';
      return `
        <div class="task-card">
          <div class="task-card__header">
            <span class="${statusClass}">${task.status}</span>
            <span class="muted">${dueDate}${dueTime}</span>
          </div>
          <h4 style="margin:8px 0 4px;">${task.title}</h4>
          <p class="muted" style="margin:0;">${task.category} • ${task.owner}</p>
          ${notes}
          <div class="task-card__actions">
            <button class="btn ghost tiny" data-task-status="${task.id}">${statusCta}</button>
            <button class="btn ghost tiny danger" data-task-delete="${task.id}">Șterge</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function nextStatusCta(status){
    if(status === 'În lucru') return 'Finalizează';
    if(status === 'Finalizat') return 'Reactivează';
    return 'Pornește taskul';
  }

  function renderMap(cl){
    const bounds = { minLat: 43.5, maxLat: 48.3, minLng: 20.0, maxLng: 29.7 };
    const markers = cl.locations.map(loc=>{
      const lat = loc.lat ?? geocode(loc.city).lat;
      const lng = loc.lng ?? geocode(loc.city).lng;
      const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
      const y = (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;
      return `<span class="map-marker" style="left:${x}%;top:${y}%;" title="${loc.label}"></span>`;
    }).join('');
    return `
      <div class="map-shell">
        <div class="map-surface"></div>
        ${markers}
      </div>
    `;
  }

  function renderActivities(cl){
    if(!cl.activities || !cl.activities.length){
      return `<div class="muted" style="margin-bottom:12px;">Nu există activități salvate. Adaugă notițele relevante pentru acest client.</div>`;
    }
    return cl.activities.map(act=>`
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div>
          <strong>${fmtDate(act.when, { day:'2-digit', month:'short' })} • ${fmtTime(act.when)}</strong>
          <div class="muted" style="font-size:12px;">${act.who}</div>
          <p style="margin:4px 0 0;">${act.note}</p>
        </div>
      </div>
    `).join('');
  }

  function renderCandidateMatchSection(cl, state, locationsOptions){
    return `
      <div class="flex-between" style="flex-wrap:wrap;gap:16px;">
        <div>
          <h3 style="margin:0;">Potrivire candidați pe zone și roluri</h3>
          <p class="muted" style="margin:4px 0 0;">Selectează locația clientului și filtrează candidații în funcție de rază și meserie.</p>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <label class="muted" style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;">
            Locație client
            <select class="input" id="match_location" style="min-width:180px;">${locationsOptions}</select>
          </label>
          <label class="muted" style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;">
            Rază (km)
            <select class="input" id="match_radius" style="min-width:120px;">
              ${[20,50,100,200,500].map(opt=>`<option value="${opt}" ${opt===state.matchRadius?'selected':''}>${opt} km</option>`).join('')}
            </select>
          </label>
          <label class="muted" style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;">
            Meserie
            <input class="input" id="match_skill" value="${state.matchSkill}" placeholder="Ex: Inginer, Operator" style="min-width:200px;">
          </label>
        </div>
      </div>
      <div id="match_results" style="margin-top:18px;">
        ${renderCandidateMatches(cl, state)}
      </div>
    `;
  }

  function renderCandidateMatches(cl, state){
    const location = cl.locations.find(loc=>loc.id===state.matchLocation) || cl.locations[0];
    if(!location){
      return `<div class="muted">Adaugă cel puțin o locație pentru a calcula potrivirile geografice.</div>`;
    }
    const baseCoords = { lat: location.lat ?? geocode(location.city).lat, lng: location.lng ?? geocode(location.city).lng };
    const skillTerm = (state.matchSkill || '').toLowerCase();

    const matches = dbCandidates.map(c=>{
      const candCity = parseCity(c.location) || 'București';
      const coords = geocode(candCity);
      const dist = distanceKm(baseCoords.lat, baseCoords.lng, coords.lat, coords.lng);
      return {
        data: c,
        distance: dist,
        city: candCity
      };
    }).filter(item=>{
      if(item.distance > state.matchRadius) return false;
      if(skillTerm && !(item.data.title || '').toLowerCase().includes(skillTerm)) return false;
      return true;
    }).sort((a,b)=>a.distance - b.distance).slice(0,8);

    if(!matches.length){
      return `<div class="muted">Nu am găsit candidați în raza selectată pentru criteriile actuale. Extinde raza sau ajustează meseria căutată.</div>`;
    }

    return `
      <div class="candidate-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;">
        ${matches.map(item=>`
          <div class="glass-card" style="padding:14px;display:flex;flex-direction:column;gap:8px;">
            <div>
              <strong>${item.data.firstName} ${item.data.lastName}</strong>
              <div class="muted" style="font-size:12px;">${item.data.title}</div>
            </div>
            <div class="muted" style="font-size:12px;">${item.city} • ${item.data.location}</div>
            <div class="muted" style="font-size:12px;">${formatNumber(item.data.experienceYears)} ani experiență</div>
            <div class="badge">${item.distance} km distanță</div>
            <button class="btn ghost" data-open-candidate="${item.data.id}"><i data-lucide="eye"></i> Vezi profil</button>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderProposed(cl){
    if(!cl.proposed?.length){
      return `<div class="muted">Nu există propuneri active. Folosește butonul „Propune candidat” pentru a trimite primul profil.</div>`;
    }
    const stages=['Propus','Interviu','Ofertă','Angajat','Respins'];
    return cl.proposed.map(p=>{
      const stageIndex = Math.max(0, stages.indexOf(p.stage));
      const pct=Math.round((stageIndex/(stages.length-1))*100);
      return `
        <div class="glass-card" style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:14px;align-items:center;margin-bottom:12px;">
          <div>
            <strong>${p.name}</strong>
            <div class="muted" style="font-size:12px;">${p.title || ''}</div>
          </div>
          <div class="progress-line"><span style="width:${pct}%"></span></div>
          <div style="text-align:right;">
            <span class="badge">${p.stage}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function exportClient(cl){
    const rows=[
      ['Client', 'Industrie', 'Manager', 'Email manager', 'Contact', 'Email contact', 'Telefon contact', 'Locații', 'Proiecte active', 'Valoare pipeline (RON)', 'Propuneri', 'Plasări']
    ];
    rows.push([
      cl.name,
      cl.industry,
      cl.owner?.name || '',
      cl.owner?.email || '',
      cl.contact?.name || '',
      cl.contact?.email || '',
      cl.contact?.phone || '',
      (cl.locations||[]).map(loc=>`${loc.label} (${loc.city})`).join(' | '),
      (cl.projects||[]).map(p=>`${p.title} (${p.openings || 0} poziții, ${p.fee})`).join(' | '),
      sumProjectsValue(cl),
      cl.proposed?.length || 0,
      cl.placements?.length || 0
    ]);

    rows.push([]);
    rows.push(['Proiecte detaliat']);
    rows.push(['Titlu','Locație','Tip contract','Poziții','Fee','Valoare (RON)','Status','Data deschidere']);
    (cl.projects||[]).forEach(p=>{
      rows.push([
        p.title,
        p.location,
        p.contractType,
        p.openings,
        p.fee,
        p.projectValue,
        p.status,
        fmtDate(p.openedAt)
      ]);
    });

    const csv = rows.map(r=>r.map(value=>`"${String(value ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`client_${cl.id}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function editClient(cl){
    const cityOptions = Object.keys(CITY_COORDS).sort();
    mainContent.innerHTML=`
      <div class="card">
        <button class="btn ghost" id="back_client"><i data-lucide="arrow-left"></i> Înapoi la profil</button>
      </div>
      <div class="card">
        <h2>Editează ${cl.name}</h2>
        <p class="muted">Actualizează detaliile de bază, contactele și informațiile financiare.</p>
        <div class="grid-two" style="margin-top:20px;gap:20px;">
          <div>
            <label>Nume companie
              <input id="edit_name" class="input" value="${cl.name}">
            </label>
            <label>Domeniu activitate
              <input id="edit_industry" class="input" value="${cl.industry}">
            </label>
            <label>Website companie
              <input id="edit_website" class="input" value="${cl.website || ''}">
            </label>
            <label>Număr angajați
              <input id="edit_size" class="input" value="${cl.size || ''}">
            </label>
            <label>Telefon companie
              <input id="edit_phone" class="input" value="${cl.phone || ''}">
            </label>
            <label>Termene plată
              <input id="edit_terms" class="input" value="${cl.paymentTerms || ''}">
            </label>
            <label>Notițe
              <textarea id="edit_notes" class="input" rows="3">${cl.notes || ''}</textarea>
            </label>
          </div>
          <div>
            <label>Țară
              <input id="edit_country" class="input" value="${cl.country}">
            </label>
            <label>Oraș principal
              <select id="edit_city" class="input">
                ${cityOptions.map(city=>`<option value="${city}" ${cl.city===city?'selected':''}>${city}</option>`).join('')}
              </select>
            </label>
            <label>Adresă sediu
              <input id="edit_address" class="input" value="${cl.address || ''}">
            </label>
            <label>CUI / VAT
              <input id="edit_vat" class="input" value="${cl.vat || ''}">
            </label>
            <label>Persoană contact
              <input id="edit_contact_name" class="input" value="${cl.contact?.name || ''}">
            </label>
            <label>Rol contact
              <input id="edit_contact_role" class="input" value="${cl.contact?.role || ''}">
            </label>
            <label>Email contact
              <input id="edit_contact_email" class="input" value="${cl.contact?.email || ''}">
            </label>
            <label>Telefon contact
              <input id="edit_contact_phone" class="input" value="${cl.contact?.phone || ''}">
            </label>
          </div>
        </div>
        <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap;">
          <button class="btn" id="save_edit"><i data-lucide="save"></i> Salvează</button>
          <button class="btn ghost" id="cancel_edit"><i data-lucide="x"></i> Anulează</button>
        </div>
      </div>
    `;

    document.getElementById('back_client').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('cancel_edit').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('save_edit').addEventListener('click',()=>{
      cl.name = document.getElementById('edit_name').value.trim() || cl.name;
      cl.industry = document.getElementById('edit_industry').value.trim() || cl.industry;
      cl.website = document.getElementById('edit_website').value.trim();
      cl.size = document.getElementById('edit_size').value.trim();
      cl.phone = document.getElementById('edit_phone').value.trim();
      cl.paymentTerms = document.getElementById('edit_terms').value.trim();
      cl.notes = document.getElementById('edit_notes').value.trim();
      cl.country = document.getElementById('edit_country').value.trim() || cl.country;
      cl.city = document.getElementById('edit_city').value;
      cl.address = document.getElementById('edit_address').value.trim();
      cl.vat = document.getElementById('edit_vat').value.trim();
      cl.contact = {
        name: document.getElementById('edit_contact_name').value.trim(),
        role: document.getElementById('edit_contact_role').value.trim(),
        email: document.getElementById('edit_contact_email').value.trim(),
        phone: document.getElementById('edit_contact_phone').value.trim()
      };
      if(cl.locations && cl.locations[0]){
        cl.locations[0].city = cl.city;
        cl.locations[0].address = cl.address;
        cl.locations[0].label = cl.locations[0].label || `Sediu ${cl.city}`;
        cl.locations[0].lat = geocode(cl.city).lat;
        cl.locations[0].lng = geocode(cl.city).lng;
      }
      cl.updatedAt = new Date().toISOString();
      save(STORAGE_KEY, dbClients);
      alert('Profil client actualizat.');
      openClient(cl.id);
    });
    if (window.lucide) { lucide.createIcons(); }
  }

  function addLocation(cl){
    const cityOptions = Object.keys(CITY_COORDS).sort();
    mainContent.innerHTML=`
      <div class="card">
        <button class="btn ghost" id="back_client"><i data-lucide="arrow-left"></i> Înapoi la ${cl.name}</button>
      </div>
      <div class="card">
        <h2>Locație nouă</h2>
        <p class="muted">Adaugă un punct operațional pentru a-l vedea pe hartă și în filtrele de potrivire candidați.</p>
        <div class="grid-two" style="margin-top:20px;gap:20px;">
          <label>Nume locație
            <input id="loc_label" class="input" placeholder="Ex: Depozit Ploiești">
          </label>
          <label>Oraș
            <select id="loc_city" class="input">
              ${cityOptions.map(city=>`<option value="${city}">${city}</option>`).join('')}
            </select>
          </label>
          <label>Adresă completă
            <input id="loc_address" class="input" placeholder="Stradă, număr, județ">
          </label>
          <label>Județ
            <input id="loc_county" class="input" placeholder="Ex: Prahova">
          </label>
          <label>Roluri active
            <input id="loc_roles" class="input" placeholder="Separă prin virgulă">
          </label>
        </div>
        <div style="margin-top:20px;display:flex;gap:12px;">
          <button class="btn" id="save_location"><i data-lucide="save"></i> Salvează locația</button>
          <button class="btn ghost" id="cancel_location"><i data-lucide="x"></i> Anulează</button>
        </div>
      </div>
    `;

    document.getElementById('back_client').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('cancel_location').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('save_location').addEventListener('click',()=>{
      const label = document.getElementById('loc_label').value.trim();
      const city = document.getElementById('loc_city').value;
      const address = document.getElementById('loc_address').value.trim();
      if(!label || !city || !address){
        alert('Completează numele, orașul și adresa locației.');
        return;
      }
      const coords = geocode(city);
      cl.locations = cl.locations || [];
      cl.locations.push({
        id: 'loc-'+shortId(),
        label,
        address,
        city,
        county: document.getElementById('loc_county').value.trim(),
        lat: coords.lat,
        lng: coords.lng,
        activeRoles: document.getElementById('loc_roles').value.split(',').map(x=>x.trim()).filter(Boolean)
      });
      cl.updatedAt = new Date().toISOString();
      save(STORAGE_KEY, dbClients);
      alert('Locație adăugată.');
      openClient(cl.id);
    });
    if (window.lucide) { lucide.createIcons(); }
  }

  function addProject(cl){
    if(!cl.locations?.length){
      alert('Adaugă mai întâi o locație pentru a crea proiecte asociate.');
      return;
    }
    mainContent.innerHTML=`
      <div class="card">
        <button class="btn ghost" id="back_client"><i data-lucide="arrow-left"></i> Înapoi la ${cl.name}</button>
      </div>
      <div class="card">
        <h2>Proiect nou pentru ${cl.name}</h2>
        <p class="muted">Definește rolul, taxa și locația pentru noul proiect în pipeline.</p>
        <div class="grid-two" style="margin-top:20px;gap:20px;">
          <label>Rol / Titlu poziție
            <input id="proj_title" class="input" placeholder="Ex: Inginer service">
          </label>
          <label>Locație proiect
            <select id="proj_location" class="input">
              ${cl.locations.map(loc=>`<option value="${loc.id}">${loc.label} (${loc.city})</option>`).join('')}
            </select>
          </label>
          <label>Număr poziții
            <input id="proj_openings" class="input" type="number" min="1" value="1">
          </label>
          <label>Fee (%)
            <input id="proj_fee" class="input" placeholder="Ex: 18%">
          </label>
          <label>Valoare proiect (RON)
            <input id="proj_value" class="input" type="number" min="0" step="1000" placeholder="Ex: 45000">
          </label>
          <label>Tip contract
            <input id="proj_contract" class="input" placeholder="Ex: Permanent">
          </label>
          <label>Status
            <select id="proj_status" class="input">
              <option>Deschis</option>
              <option>Interviu</option>
              <option>Ofertă</option>
              <option>Angajat</option>
              <option>Închis</option>
            </select>
          </label>
          <label>Tag-uri
            <input id="proj_tags" class="input" placeholder="Separă cu virgulă (ex: Logistică, Senior)">
          </label>
        </div>
        <label style="display:block;margin-top:18px;">Detalii suplimentare
          <textarea id="proj_notes" class="input" rows="3" placeholder="Context rol, cerințe, beneficii"></textarea>
        </label>
        <div style="margin-top:20px;display:flex;gap:12px;">
          <button class="btn" id="save_project"><i data-lucide="save"></i> Salvează proiect</button>
          <button class="btn ghost" id="cancel_project"><i data-lucide="x"></i> Anulează</button>
        </div>
      </div>
    `;

    document.getElementById('back_client').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('cancel_project').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('save_project').addEventListener('click',()=>{
      const title = document.getElementById('proj_title').value.trim();
      const locationId = document.getElementById('proj_location').value;
      if(!title || !locationId){
        alert('Completează titlul rolului și selectează o locație.');
        return;
      }
      const openings = parseInt(document.getElementById('proj_openings').value,10) || 1;
      const fee = document.getElementById('proj_fee').value.trim() || '15%';
      const value = parseFloat(document.getElementById('proj_value').value) || 0;
      const location = cl.locations.find(l=>l.id===locationId);
      const project = {
        id: 'proj-'+shortId(),
        title,
        locationId,
        location: location?.label || '',
        openings,
        fee,
        projectValue: value,
        contractType: document.getElementById('proj_contract').value.trim() || 'Permanent',
        status: document.getElementById('proj_status').value,
        openedAt: new Date().toISOString(),
        tags: document.getElementById('proj_tags').value.split(',').map(x=>x.trim()).filter(Boolean),
        notes: document.getElementById('proj_notes').value.trim()
      };
      cl.projects = cl.projects || [];
      cl.projects.unshift(project);
      cl.updatedAt = new Date().toISOString();
      save(STORAGE_KEY, dbClients);
      alert('Proiect adăugat în pipeline.');
      openClient(cl.id);
    });
    if (window.lucide) { lucide.createIcons(); }
  }

  function exportClient(cl){
    const rows=[
      ['Client', 'Industrie', 'Manager', 'Email manager', 'Contact', 'Email contact', 'Telefon contact', 'Locații', 'Proiecte active', 'Valoare pipeline (RON)', 'Propuneri', 'Plasări']
    ];
    rows.push([
      cl.name,
      cl.industry,
      cl.owner?.name || '',
      cl.owner?.email || '',
      cl.contact?.name || '',
      cl.contact?.email || '',
      cl.contact?.phone || '',
      (cl.locations||[]).map(loc=>`${loc.label} (${loc.city})`).join(' | '),
      (cl.projects||[]).map(p=>`${p.title} (${p.openings || 0} poziții, ${p.fee})`).join(' | '),
      sumProjectsValue(cl),
      cl.proposed?.length || 0,
      cl.placements?.length || 0
    ]);

    rows.push([]);
    rows.push(['Proiecte detaliat']);
    rows.push(['Titlu','Locație','Tip contract','Poziții','Fee','Valoare (RON)','Status','Data deschidere']);
    (cl.projects||[]).forEach(p=>{
      rows.push([
        p.title,
        p.location,
        p.contractType,
        p.openings,
        p.fee,
        p.projectValue,
        p.status,
        fmtDate(p.openedAt)
      ]);
    });

    const csv = rows.map(r=>r.map(value=>`"${String(value ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`client_${cl.id}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function editClient(cl){
    const cityOptions = Object.keys(CITY_COORDS).sort();
    mainContent.innerHTML=`
      <div class="card">
        <button class="btn ghost" id="back_client"><i data-lucide="arrow-left"></i> Înapoi la profil</button>
      </div>
      <div class="card">
        <h2>Editează ${cl.name}</h2>
        <p class="muted">Actualizează detaliile de bază, contactele și informațiile financiare.</p>
        <div class="grid-two" style="margin-top:20px;gap:20px;">
          <div>
            <label>Nume companie
              <input id="edit_name" class="input" value="${cl.name}">
            </label>
            <label>Domeniu activitate
              <input id="edit_industry" class="input" value="${cl.industry}">
            </label>
            <label>Website companie
              <input id="edit_website" class="input" value="${cl.website || ''}">
            </label>
            <label>Număr angajați
              <input id="edit_size" class="input" value="${cl.size || ''}">
            </label>
            <label>Telefon companie
              <input id="edit_phone" class="input" value="${cl.phone || ''}">
            </label>
            <label>Termene plată
              <input id="edit_terms" class="input" value="${cl.paymentTerms || ''}">
            </label>
            <label>Notițe
              <textarea id="edit_notes" class="input" rows="3">${cl.notes || ''}</textarea>
            </label>
          </div>
          <div>
            <label>Țară
              <input id="edit_country" class="input" value="${cl.country}">
            </label>
            <label>Oraș principal
              <select id="edit_city" class="input">
                ${cityOptions.map(city=>`<option value="${city}" ${cl.city===city?'selected':''}>${city}</option>`).join('')}
              </select>
            </label>
            <label>Adresă sediu
              <input id="edit_address" class="input" value="${cl.address || ''}">
            </label>
            <label>CUI / VAT
              <input id="edit_vat" class="input" value="${cl.vat || ''}">
            </label>
            <label>Persoană contact
              <input id="edit_contact_name" class="input" value="${cl.contact?.name || ''}">
            </label>
            <label>Rol contact
              <input id="edit_contact_role" class="input" value="${cl.contact?.role || ''}">
            </label>
            <label>Email contact
              <input id="edit_contact_email" class="input" value="${cl.contact?.email || ''}">
            </label>
            <label>Telefon contact
              <input id="edit_contact_phone" class="input" value="${cl.contact?.phone || ''}">
            </label>
          </div>
        </div>
        <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap;">
          <button class="btn" id="save_edit"><i data-lucide="save"></i> Salvează</button>
          <button class="btn ghost" id="cancel_edit"><i data-lucide="x"></i> Anulează</button>
        </div>
      </div>
    `;

    document.getElementById('back_client').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('cancel_edit').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('save_edit').addEventListener('click',()=>{
      cl.name = document.getElementById('edit_name').value.trim() || cl.name;
      cl.industry = document.getElementById('edit_industry').value.trim() || cl.industry;
      cl.website = document.getElementById('edit_website').value.trim();
      cl.size = document.getElementById('edit_size').value.trim();
      cl.phone = document.getElementById('edit_phone').value.trim();
      cl.paymentTerms = document.getElementById('edit_terms').value.trim();
      cl.notes = document.getElementById('edit_notes').value.trim();
      cl.country = document.getElementById('edit_country').value.trim() || cl.country;
      cl.city = document.getElementById('edit_city').value;
      cl.address = document.getElementById('edit_address').value.trim();
      cl.vat = document.getElementById('edit_vat').value.trim();
      cl.contact = {
        name: document.getElementById('edit_contact_name').value.trim(),
        role: document.getElementById('edit_contact_role').value.trim(),
        email: document.getElementById('edit_contact_email').value.trim(),
        phone: document.getElementById('edit_contact_phone').value.trim()
      };
      if(cl.locations && cl.locations[0]){
        cl.locations[0].city = cl.city;
        cl.locations[0].address = cl.address;
        cl.locations[0].label = cl.locations[0].label || `Sediu ${cl.city}`;
        cl.locations[0].lat = geocode(cl.city).lat;
        cl.locations[0].lng = geocode(cl.city).lng;
      }
      cl.updatedAt = new Date().toISOString();
      save(STORAGE_KEY, dbClients);
      alert('Profil client actualizat.');
      openClient(cl.id);
    });
    if (window.lucide) { lucide.createIcons(); }
  }

  function addLocation(cl){
    const cityOptions = Object.keys(CITY_COORDS).sort();
    mainContent.innerHTML=`
      <div class="card">
        <button class="btn ghost" id="back_client"><i data-lucide="arrow-left"></i> Înapoi la ${cl.name}</button>
      </div>
      <div class="card">
        <h2>Locație nouă</h2>
        <p class="muted">Adaugă un punct operațional pentru a-l vedea pe hartă și în filtrele de potrivire candidați.</p>
        <div class="grid-two" style="margin-top:20px;gap:20px;">
          <label>Nume locație
            <input id="loc_label" class="input" placeholder="Ex: Depozit Ploiești">
          </label>
          <label>Oraș
            <select id="loc_city" class="input">
              ${cityOptions.map(city=>`<option value="${city}">${city}</option>`).join('')}
            </select>
          </label>
          <label>Adresă completă
            <input id="loc_address" class="input" placeholder="Stradă, număr, județ">
          </label>
          <label>Județ
            <input id="loc_county" class="input" placeholder="Ex: Prahova">
          </label>
          <label>Roluri active
            <input id="loc_roles" class="input" placeholder="Separă prin virgulă">
          </label>
        </div>
        <div style="margin-top:20px;display:flex;gap:12px;">
          <button class="btn" id="save_location"><i data-lucide="save"></i> Salvează locația</button>
          <button class="btn ghost" id="cancel_location"><i data-lucide="x"></i> Anulează</button>
        </div>
      </div>
    `;

    document.getElementById('back_client').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('cancel_location').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('save_location').addEventListener('click',()=>{
      const label = document.getElementById('loc_label').value.trim();
      const city = document.getElementById('loc_city').value;
      const address = document.getElementById('loc_address').value.trim();
      if(!label || !city || !address){
        alert('Completează numele, orașul și adresa locației.');
        return;
      }
      const coords = geocode(city);
      cl.locations = cl.locations || [];
      cl.locations.push({
        id: 'loc-'+shortId(),
        label,
        address,
        city,
        county: document.getElementById('loc_county').value.trim(),
        lat: coords.lat,
        lng: coords.lng,
        activeRoles: document.getElementById('loc_roles').value.split(',').map(x=>x.trim()).filter(Boolean)
      });
      cl.updatedAt = new Date().toISOString();
      save(STORAGE_KEY, dbClients);
      alert('Locație adăugată.');
      openClient(cl.id);
    });
    if (window.lucide) { lucide.createIcons(); }
  }

  function addProject(cl){
    if(!cl.locations?.length){
      alert('Adaugă mai întâi o locație pentru a crea proiecte asociate.');
      return;
    }
    mainContent.innerHTML=`
      <div class="card">
        <button class="btn ghost" id="back_client"><i data-lucide="arrow-left"></i> Înapoi la ${cl.name}</button>
      </div>
      <div class="card">
        <h2>Proiect nou pentru ${cl.name}</h2>
        <p class="muted">Definește rolul, taxa și locația pentru noul proiect în pipeline.</p>
        <div class="grid-two" style="margin-top:20px;gap:20px;">
          <label>Rol / Titlu poziție
            <input id="proj_title" class="input" placeholder="Ex: Inginer service">
          </label>
          <label>Locație proiect
            <select id="proj_location" class="input">
              ${cl.locations.map(loc=>`<option value="${loc.id}">${loc.label} (${loc.city})</option>`).join('')}
            </select>
          </label>
          <label>Număr poziții
            <input id="proj_openings" class="input" type="number" min="1" value="1">
          </label>
          <label>Fee (%)
            <input id="proj_fee" class="input" placeholder="Ex: 18%">
          </label>
          <label>Valoare proiect (RON)
            <input id="proj_value" class="input" type="number" min="0" step="1000" placeholder="Ex: 45000">
          </label>
          <label>Tip contract
            <input id="proj_contract" class="input" placeholder="Ex: Permanent">
          </label>
          <label>Status
            <select id="proj_status" class="input">
              <option>Deschis</option>
              <option>Interviu</option>
              <option>Ofertă</option>
              <option>Angajat</option>
              <option>Închis</option>
            </select>
          </label>
          <label>Tag-uri
            <input id="proj_tags" class="input" placeholder="Separă cu virgulă (ex: Logistică, Senior)">
          </label>
        </div>
        <label style="display:block;margin-top:18px;">Detalii suplimentare
          <textarea id="proj_notes" class="input" rows="3" placeholder="Context rol, cerințe, beneficii"></textarea>
        </label>
        <div style="margin-top:20px;display:flex;gap:12px;">
          <button class="btn" id="save_project"><i data-lucide="save"></i> Salvează proiect</button>
          <button class="btn ghost" id="cancel_project"><i data-lucide="x"></i> Anulează</button>
        </div>
      </div>
    `;

    document.getElementById('back_client').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('cancel_project').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('save_project').addEventListener('click',()=>{
      const title = document.getElementById('proj_title').value.trim();
      const locationId = document.getElementById('proj_location').value;
      if(!title || !locationId){
        alert('Completează titlul rolului și selectează o locație.');
        return;
      }
      const openings = parseInt(document.getElementById('proj_openings').value,10) || 1;
      const fee = document.getElementById('proj_fee').value.trim() || '15%';
      const value = parseFloat(document.getElementById('proj_value').value) || 0;
      const location = cl.locations.find(l=>l.id===locationId);
      const project = {
        id: 'proj-'+shortId(),
        title,
        locationId,
        location: location?.label || '',
        openings,
        fee,
        projectValue: value,
        contractType: document.getElementById('proj_contract').value.trim() || 'Permanent',
        status: document.getElementById('proj_status').value,
        openedAt: new Date().toISOString(),
        tags: document.getElementById('proj_tags').value.split(',').map(x=>x.trim()).filter(Boolean),
        notes: document.getElementById('proj_notes').value.trim()
      };
      cl.projects = cl.projects || [];
      cl.projects.unshift(project);
      cl.updatedAt = new Date().toISOString();
      save(STORAGE_KEY, dbClients);
      alert('Proiect adăugat în pipeline.');
      openClient(cl.id);
    });
    if (window.lucide) { lucide.createIcons(); }
  }

  function exportClient(cl){
    const rows=[
      ['Client', 'Industrie', 'Manager', 'Email manager', 'Contact', 'Email contact', 'Telefon contact', 'Locații', 'Proiecte active', 'Valoare pipeline (RON)', 'Propuneri', 'Plasări']
    ];
    rows.push([
      cl.name,
      cl.industry,
      cl.owner?.name || '',
      cl.owner?.email || '',
      cl.contact?.name || '',
      cl.contact?.email || '',
      cl.contact?.phone || '',
      (cl.locations||[]).map(loc=>`${loc.label} (${loc.city})`).join(' | '),
      (cl.projects||[]).map(p=>`${p.title} (${p.openings || 0} poziții, ${p.fee})`).join(' | '),
      sumProjectsValue(cl),
      cl.proposed?.length || 0,
      cl.placements?.length || 0
    ]);

    rows.push([]);
    rows.push(['Proiecte detaliat']);
    rows.push(['Titlu','Locație','Tip contract','Poziții','Fee','Valoare (RON)','Status','Data deschidere']);
    (cl.projects||[]).forEach(p=>{
      rows.push([
        p.title,
        p.location,
        p.contractType,
        p.openings,
        p.fee,
        p.projectValue,
        p.status,
        fmtDate(p.openedAt)
      ]);
    });

    const csv = rows.map(r=>r.map(value=>`"${String(value ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`client_${cl.id}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function editClient(cl){
    const cityOptions = Object.keys(CITY_COORDS).sort();
    mainContent.innerHTML=`
      <div class="card">
        <button class="btn ghost" id="back_client"><i data-lucide="arrow-left"></i> Înapoi la profil</button>
      </div>
      <div class="card">
        <h2>Editează ${cl.name}</h2>
        <p class="muted">Actualizează detaliile de bază, contactele și informațiile financiare.</p>
        <div class="grid-two" style="margin-top:20px;gap:20px;">
          <div>
            <label>Nume companie
              <input id="edit_name" class="input" value="${cl.name}">
            </label>
            <label>Domeniu activitate
              <input id="edit_industry" class="input" value="${cl.industry}">
            </label>
            <label>Website companie
              <input id="edit_website" class="input" value="${cl.website || ''}">
            </label>
            <label>Număr angajați
              <input id="edit_size" class="input" value="${cl.size || ''}">
            </label>
            <label>Telefon companie
              <input id="edit_phone" class="input" value="${cl.phone || ''}">
            </label>
            <label>Termene plată
              <input id="edit_terms" class="input" value="${cl.paymentTerms || ''}">
            </label>
            <label>Notițe
              <textarea id="edit_notes" class="input" rows="3">${cl.notes || ''}</textarea>
            </label>
          </div>
          <div>
            <label>Țară
              <input id="edit_country" class="input" value="${cl.country}">
            </label>
            <label>Oraș principal
              <select id="edit_city" class="input">
                ${cityOptions.map(city=>`<option value="${city}" ${cl.city===city?'selected':''}>${city}</option>`).join('')}
              </select>
            </label>
            <label>Adresă sediu
              <input id="edit_address" class="input" value="${cl.address || ''}">
            </label>
            <label>CUI / VAT
              <input id="edit_vat" class="input" value="${cl.vat || ''}">
            </label>
            <label>Persoană contact
              <input id="edit_contact_name" class="input" value="${cl.contact?.name || ''}">
            </label>
            <label>Rol contact
              <input id="edit_contact_role" class="input" value="${cl.contact?.role || ''}">
            </label>
            <label>Email contact
              <input id="edit_contact_email" class="input" value="${cl.contact?.email || ''}">
            </label>
            <label>Telefon contact
              <input id="edit_contact_phone" class="input" value="${cl.contact?.phone || ''}">
            </label>
          </div>
        </div>
        <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap;">
          <button class="btn" id="save_edit"><i data-lucide="save"></i> Salvează</button>
          <button class="btn ghost" id="cancel_edit"><i data-lucide="x"></i> Anulează</button>
        </div>
      </div>
    `;

    document.getElementById('back_client').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('cancel_edit').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('save_edit').addEventListener('click',()=>{
      cl.name = document.getElementById('edit_name').value.trim() || cl.name;
      cl.industry = document.getElementById('edit_industry').value.trim() || cl.industry;
      cl.website = document.getElementById('edit_website').value.trim();
      cl.size = document.getElementById('edit_size').value.trim();
      cl.phone = document.getElementById('edit_phone').value.trim();
      cl.paymentTerms = document.getElementById('edit_terms').value.trim();
      cl.notes = document.getElementById('edit_notes').value.trim();
      cl.country = document.getElementById('edit_country').value.trim() || cl.country;
      cl.city = document.getElementById('edit_city').value;
      cl.address = document.getElementById('edit_address').value.trim();
      cl.vat = document.getElementById('edit_vat').value.trim();
      cl.contact = {
        name: document.getElementById('edit_contact_name').value.trim(),
        role: document.getElementById('edit_contact_role').value.trim(),
        email: document.getElementById('edit_contact_email').value.trim(),
        phone: document.getElementById('edit_contact_phone').value.trim()
      };
      if(cl.locations && cl.locations[0]){
        cl.locations[0].city = cl.city;
        cl.locations[0].address = cl.address;
        cl.locations[0].label = cl.locations[0].label || `Sediu ${cl.city}`;
        cl.locations[0].lat = geocode(cl.city).lat;
        cl.locations[0].lng = geocode(cl.city).lng;
      }
      cl.updatedAt = new Date().toISOString();
      save(STORAGE_KEY, dbClients);
      alert('Profil client actualizat.');
      openClient(cl.id);
    });
    if (window.lucide) { lucide.createIcons(); }
  }

  function addLocation(cl){
    const cityOptions = Object.keys(CITY_COORDS).sort();
    mainContent.innerHTML=`
      <div class="card">
        <button class="btn ghost" id="back_client"><i data-lucide="arrow-left"></i> Înapoi la ${cl.name}</button>
      </div>
      <div class="card">
        <h2>Locație nouă</h2>
        <p class="muted">Adaugă un punct operațional pentru a-l vedea pe hartă și în filtrele de potrivire candidați.</p>
        <div class="grid-two" style="margin-top:20px;gap:20px;">
          <label>Nume locație
            <input id="loc_label" class="input" placeholder="Ex: Depozit Ploiești">
          </label>
          <label>Oraș
            <select id="loc_city" class="input">
              ${cityOptions.map(city=>`<option value="${city}">${city}</option>`).join('')}
            </select>
          </label>
          <label>Adresă completă
            <input id="loc_address" class="input" placeholder="Stradă, număr, județ">
          </label>
          <label>Județ
            <input id="loc_county" class="input" placeholder="Ex: Prahova">
          </label>
          <label>Roluri active
            <input id="loc_roles" class="input" placeholder="Separă prin virgulă">
          </label>
        </div>
        <div style="margin-top:20px;display:flex;gap:12px;">
          <button class="btn" id="save_location"><i data-lucide="save"></i> Salvează locația</button>
          <button class="btn ghost" id="cancel_location"><i data-lucide="x"></i> Anulează</button>
        </div>
      </div>
    `;

    document.getElementById('back_client').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('cancel_location').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('save_location').addEventListener('click',()=>{
      const label = document.getElementById('loc_label').value.trim();
      const city = document.getElementById('loc_city').value;
      const address = document.getElementById('loc_address').value.trim();
      if(!label || !city || !address){
        alert('Completează numele, orașul și adresa locației.');
        return;
      }
      const coords = geocode(city);
      cl.locations = cl.locations || [];
      cl.locations.push({
        id: 'loc-'+shortId(),
        label,
        address,
        city,
        county: document.getElementById('loc_county').value.trim(),
        lat: coords.lat,
        lng: coords.lng,
        activeRoles: document.getElementById('loc_roles').value.split(',').map(x=>x.trim()).filter(Boolean)
      });
      cl.updatedAt = new Date().toISOString();
      save(STORAGE_KEY, dbClients);
      alert('Locație adăugată.');
      openClient(cl.id);
    });
    if (window.lucide) { lucide.createIcons(); }
  }

  function addProject(cl){
    if(!cl.locations?.length){
      alert('Adaugă mai întâi o locație pentru a crea proiecte asociate.');
      return;
    }
    mainContent.innerHTML=`
      <div class="card">
        <button class="btn ghost" id="back_client"><i data-lucide="arrow-left"></i> Înapoi la ${cl.name}</button>
      </div>
      <div class="card">
        <h2>Proiect nou pentru ${cl.name}</h2>
        <p class="muted">Definește rolul, taxa și locația pentru noul proiect în pipeline.</p>
        <div class="grid-two" style="margin-top:20px;gap:20px;">
          <label>Rol / Titlu poziție
            <input id="proj_title" class="input" placeholder="Ex: Inginer service">
          </label>
          <label>Locație proiect
            <select id="proj_location" class="input">
              ${cl.locations.map(loc=>`<option value="${loc.id}">${loc.label} (${loc.city})</option>`).join('')}
            </select>
          </label>
          <label>Număr poziții
            <input id="proj_openings" class="input" type="number" min="1" value="1">
          </label>
          <label>Fee (%)
            <input id="proj_fee" class="input" placeholder="Ex: 18%">
          </label>
          <label>Valoare proiect (RON)
            <input id="proj_value" class="input" type="number" min="0" step="1000" placeholder="Ex: 45000">
          </label>
          <label>Tip contract
            <input id="proj_contract" class="input" placeholder="Ex: Permanent">
          </label>
          <label>Status
            <select id="proj_status" class="input">
              <option>Deschis</option>
              <option>Interviu</option>
              <option>Ofertă</option>
              <option>Angajat</option>
              <option>Închis</option>
            </select>
          </label>
          <label>Tag-uri
            <input id="proj_tags" class="input" placeholder="Separă cu virgulă (ex: Logistică, Senior)">
          </label>
        </div>
        <label style="display:block;margin-top:18px;">Detalii suplimentare
          <textarea id="proj_notes" class="input" rows="3" placeholder="Context rol, cerințe, beneficii"></textarea>
        </label>
        <div style="margin-top:20px;display:flex;gap:12px;">
          <button class="btn" id="save_project"><i data-lucide="save"></i> Salvează proiect</button>
          <button class="btn ghost" id="cancel_project"><i data-lucide="x"></i> Anulează</button>
        </div>
      </div>
    `;

    document.getElementById('back_client').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('cancel_project').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('save_project').addEventListener('click',()=>{
      const title = document.getElementById('proj_title').value.trim();
      const locationId = document.getElementById('proj_location').value;
      if(!title || !locationId){
        alert('Completează titlul rolului și selectează o locație.');
        return;
      }
      const openings = parseInt(document.getElementById('proj_openings').value,10) || 1;
      const fee = document.getElementById('proj_fee').value.trim() || '15%';
      const value = parseFloat(document.getElementById('proj_value').value) || 0;
      const location = cl.locations.find(l=>l.id===locationId);
      const project = {
        id: 'proj-'+shortId(),
        title,
        locationId,
        location: location?.label || '',
        openings,
        fee,
        projectValue: value,
        contractType: document.getElementById('proj_contract').value.trim() || 'Permanent',
        status: document.getElementById('proj_status').value,
        openedAt: new Date().toISOString(),
        tags: document.getElementById('proj_tags').value.split(',').map(x=>x.trim()).filter(Boolean),
        notes: document.getElementById('proj_notes').value.trim()
      };
      cl.projects = cl.projects || [];
      cl.projects.unshift(project);
      cl.updatedAt = new Date().toISOString();
      save(STORAGE_KEY, dbClients);
      alert('Proiect adăugat în pipeline.');
      openClient(cl.id);
    });
    if (window.lucide) { lucide.createIcons(); }
  }

  function exportClient(cl){
    const rows=[
      ['Client', 'Industrie', 'Manager', 'Email manager', 'Contact', 'Email contact', 'Telefon contact', 'Locații', 'Proiecte active', 'Valoare pipeline (RON)', 'Propuneri', 'Plasări']
    ];
    rows.push([
      cl.name,
      cl.industry,
      cl.owner?.name || '',
      cl.owner?.email || '',
      cl.contact?.name || '',
      cl.contact?.email || '',
      cl.contact?.phone || '',
      (cl.locations||[]).map(loc=>`${loc.label} (${loc.city})`).join(' | '),
      (cl.projects||[]).map(p=>`${p.title} (${p.openings || 0} poziții, ${p.fee})`).join(' | '),
      sumProjectsValue(cl),
      cl.proposed?.length || 0,
      cl.placements?.length || 0
    ]);

    rows.push([]);
    rows.push(['Proiecte detaliat']);
    rows.push(['Titlu','Locație','Tip contract','Poziții','Fee','Valoare (RON)','Status','Data deschidere']);
    (cl.projects||[]).forEach(p=>{
      rows.push([
        p.title,
        p.location,
        p.contractType,
        p.openings,
        p.fee,
        p.projectValue,
        p.status,
        fmtDate(p.openedAt)
      ]);
    });

    const csv = rows.map(r=>r.map(value=>`"${String(value ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`client_${cl.id}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function editClient(cl){
    const cityOptions = Object.keys(CITY_COORDS).sort();
    mainContent.innerHTML=`
      <div class="card">
        <button class="btn ghost" id="back_client"><i data-lucide="arrow-left"></i> Înapoi la profil</button>
      </div>
      <div class="card">
        <h2>Editează ${cl.name}</h2>
        <p class="muted">Actualizează detaliile de bază, contactele și informațiile financiare.</p>
        <div class="grid-two" style="margin-top:20px;gap:20px;">
          <div>
            <label>Nume companie
              <input id="edit_name" class="input" value="${cl.name}">
            </label>
            <label>Domeniu activitate
              <input id="edit_industry" class="input" value="${cl.industry}">
            </label>
            <label>Website companie
              <input id="edit_website" class="input" value="${cl.website || ''}">
            </label>
            <label>Număr angajați
              <input id="edit_size" class="input" value="${cl.size || ''}">
            </label>
            <label>Telefon companie
              <input id="edit_phone" class="input" value="${cl.phone || ''}">
            </label>
            <label>Termene plată
              <input id="edit_terms" class="input" value="${cl.paymentTerms || ''}">
            </label>
            <label>Notițe
              <textarea id="edit_notes" class="input" rows="3">${cl.notes || ''}</textarea>
            </label>
          </div>
          <div>
            <label>Țară
              <input id="edit_country" class="input" value="${cl.country}">
            </label>
            <label>Oraș principal
              <select id="edit_city" class="input">
                ${cityOptions.map(city=>`<option value="${city}" ${cl.city===city?'selected':''}>${city}</option>`).join('')}
              </select>
            </label>
            <label>Adresă sediu
              <input id="edit_address" class="input" value="${cl.address || ''}">
            </label>
            <label>CUI / VAT
              <input id="edit_vat" class="input" value="${cl.vat || ''}">
            </label>
            <label>Persoană contact
              <input id="edit_contact_name" class="input" value="${cl.contact?.name || ''}">
            </label>
            <label>Rol contact
              <input id="edit_contact_role" class="input" value="${cl.contact?.role || ''}">
            </label>
            <label>Email contact
              <input id="edit_contact_email" class="input" value="${cl.contact?.email || ''}">
            </label>
            <label>Telefon contact
              <input id="edit_contact_phone" class="input" value="${cl.contact?.phone || ''}">
            </label>
          </div>
        </div>
        <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap;">
          <button class="btn" id="save_edit"><i data-lucide="save"></i> Salvează</button>
          <button class="btn ghost" id="cancel_edit"><i data-lucide="x"></i> Anulează</button>
        </div>
      </div>
    `;

    document.getElementById('back_client').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('cancel_edit').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('save_edit').addEventListener('click',()=>{
      cl.name = document.getElementById('edit_name').value.trim() || cl.name;
      cl.industry = document.getElementById('edit_industry').value.trim() || cl.industry;
      cl.website = document.getElementById('edit_website').value.trim();
      cl.size = document.getElementById('edit_size').value.trim();
      cl.phone = document.getElementById('edit_phone').value.trim();
      cl.paymentTerms = document.getElementById('edit_terms').value.trim();
      cl.notes = document.getElementById('edit_notes').value.trim();
      cl.country = document.getElementById('edit_country').value.trim() || cl.country;
      cl.city = document.getElementById('edit_city').value;
      cl.address = document.getElementById('edit_address').value.trim();
      cl.vat = document.getElementById('edit_vat').value.trim();
      cl.contact = {
        name: document.getElementById('edit_contact_name').value.trim(),
        role: document.getElementById('edit_contact_role').value.trim(),
        email: document.getElementById('edit_contact_email').value.trim(),
        phone: document.getElementById('edit_contact_phone').value.trim()
      };
      if(cl.locations && cl.locations[0]){
        cl.locations[0].city = cl.city;
        cl.locations[0].address = cl.address;
        cl.locations[0].label = cl.locations[0].label || `Sediu ${cl.city}`;
        cl.locations[0].lat = geocode(cl.city).lat;
        cl.locations[0].lng = geocode(cl.city).lng;
      }
      cl.updatedAt = new Date().toISOString();
      save(STORAGE_KEY, dbClients);
      alert('Profil client actualizat.');
      openClient(cl.id);
    });
    if (window.lucide) { lucide.createIcons(); }
  }

  function addLocation(cl){
    const cityOptions = Object.keys(CITY_COORDS).sort();
    mainContent.innerHTML=`
      <div class="card">
        <button class="btn ghost" id="back_client"><i data-lucide="arrow-left"></i> Înapoi la ${cl.name}</button>
      </div>
      <div class="card">
        <h2>Locație nouă</h2>
        <p class="muted">Adaugă un punct operațional pentru a-l vedea pe hartă și în filtrele de potrivire candidați.</p>
        <div class="grid-two" style="margin-top:20px;gap:20px;">
          <label>Nume locație
            <input id="loc_label" class="input" placeholder="Ex: Depozit Ploiești">
          </label>
          <label>Oraș
            <select id="loc_city" class="input">
              ${cityOptions.map(city=>`<option value="${city}">${city}</option>`).join('')}
            </select>
          </label>
          <label>Adresă completă
            <input id="loc_address" class="input" placeholder="Stradă, număr, județ">
          </label>
          <label>Județ
            <input id="loc_county" class="input" placeholder="Ex: Prahova">
          </label>
          <label>Roluri active
            <input id="loc_roles" class="input" placeholder="Separă prin virgulă">
          </label>
        </div>
        <div style="margin-top:20px;display:flex;gap:12px;">
          <button class="btn" id="save_location"><i data-lucide="save"></i> Salvează locația</button>
          <button class="btn ghost" id="cancel_location"><i data-lucide="x"></i> Anulează</button>
        </div>
      </div>
    `;

    document.getElementById('back_client').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('cancel_location').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('save_location').addEventListener('click',()=>{
      const label = document.getElementById('loc_label').value.trim();
      const city = document.getElementById('loc_city').value;
      const address = document.getElementById('loc_address').value.trim();
      if(!label || !city || !address){
        alert('Completează numele, orașul și adresa locației.');
        return;
      }
      const coords = geocode(city);
      cl.locations = cl.locations || [];
      cl.locations.push({
        id: 'loc-'+shortId(),
        label,
        address,
        city,
        county: document.getElementById('loc_county').value.trim(),
        lat: coords.lat,
        lng: coords.lng,
        activeRoles: document.getElementById('loc_roles').value.split(',').map(x=>x.trim()).filter(Boolean)
      });
      cl.updatedAt = new Date().toISOString();
      save(STORAGE_KEY, dbClients);
      alert('Locație adăugată.');
      openClient(cl.id);
    });
    if (window.lucide) { lucide.createIcons(); }
  }

  function addProject(cl){
    if(!cl.locations?.length){
      alert('Adaugă mai întâi o locație pentru a crea proiecte asociate.');
      return;
    }
    mainContent.innerHTML=`
      <div class="card">
        <button class="btn ghost" id="back_client"><i data-lucide="arrow-left"></i> Înapoi la ${cl.name}</button>
      </div>
      <div class="card">
        <h2>Proiect nou pentru ${cl.name}</h2>
        <p class="muted">Definește rolul, taxa și locația pentru noul proiect în pipeline.</p>
        <div class="grid-two" style="margin-top:20px;gap:20px;">
          <label>Rol / Titlu poziție
            <input id="proj_title" class="input" placeholder="Ex: Inginer service">
          </label>
          <label>Locație proiect
            <select id="proj_location" class="input">
              ${cl.locations.map(loc=>`<option value="${loc.id}">${loc.label} (${loc.city})</option>`).join('')}
            </select>
          </label>
          <label>Număr poziții
            <input id="proj_openings" class="input" type="number" min="1" value="1">
          </label>
          <label>Fee (%)
            <input id="proj_fee" class="input" placeholder="Ex: 18%">
          </label>
          <label>Valoare proiect (RON)
            <input id="proj_value" class="input" type="number" min="0" step="1000" placeholder="Ex: 45000">
          </label>
          <label>Tip contract
            <input id="proj_contract" class="input" placeholder="Ex: Permanent">
          </label>
          <label>Status
            <select id="proj_status" class="input">
              <option>Deschis</option>
              <option>Interviu</option>
              <option>Ofertă</option>
              <option>Angajat</option>
              <option>Închis</option>
            </select>
          </label>
          <label>Tag-uri
            <input id="proj_tags" class="input" placeholder="Separă cu virgulă (ex: Logistică, Senior)">
          </label>
        </div>
        <label style="display:block;margin-top:18px;">Detalii suplimentare
          <textarea id="proj_notes" class="input" rows="3" placeholder="Context rol, cerințe, beneficii"></textarea>
        </label>
        <div style="margin-top:20px;display:flex;gap:12px;">
          <button class="btn" id="save_project"><i data-lucide="save"></i> Salvează proiect</button>
          <button class="btn ghost" id="cancel_project"><i data-lucide="x"></i> Anulează</button>
        </div>
      </div>
    `;

    document.getElementById('back_client').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('cancel_project').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('save_project').addEventListener('click',()=>{
      const title = document.getElementById('proj_title').value.trim();
      const locationId = document.getElementById('proj_location').value;
      if(!title || !locationId){
        alert('Completează titlul rolului și selectează o locație.');
        return;
      }
      const openings = parseInt(document.getElementById('proj_openings').value,10) || 1;
      const fee = document.getElementById('proj_fee').value.trim() || '15%';
      const value = parseFloat(document.getElementById('proj_value').value) || 0;
      const location = cl.locations.find(l=>l.id===locationId);
      const project = {
        id: 'proj-'+shortId(),
        title,
        locationId,
        location: location?.label || '',
        openings,
        fee,
        projectValue: value,
        contractType: document.getElementById('proj_contract').value.trim() || 'Permanent',
        status: document.getElementById('proj_status').value,
        openedAt: new Date().toISOString(),
        tags: document.getElementById('proj_tags').value.split(',').map(x=>x.trim()).filter(Boolean),
        notes: document.getElementById('proj_notes').value.trim()
      };
      cl.projects = cl.projects || [];
      cl.projects.unshift(project);
      cl.updatedAt = new Date().toISOString();
      save(STORAGE_KEY, dbClients);
      alert('Proiect adăugat în pipeline.');
      openClient(cl.id);
    });
    if (window.lucide) { lucide.createIcons(); }
  }

  function exportClient(cl){
    const rows=[
      ['Client', 'Industrie', 'Manager', 'Email manager', 'Contact', 'Email contact', 'Telefon contact', 'Locații', 'Proiecte active', 'Valoare pipeline (RON)', 'Propuneri', 'Plasări']
    ];
    rows.push([
      cl.name,
      cl.industry,
      cl.owner?.name || '',
      cl.owner?.email || '',
      cl.contact?.name || '',
      cl.contact?.email || '',
      cl.contact?.phone || '',
      (cl.locations||[]).map(loc=>`${loc.label} (${loc.city})`).join(' | '),
      (cl.projects||[]).map(p=>`${p.title} (${p.openings || 0} poziții, ${p.fee})`).join(' | '),
      sumProjectsValue(cl),
      cl.proposed?.length || 0,
      cl.placements?.length || 0
    ]);

    rows.push([]);
    rows.push(['Proiecte detaliat']);
    rows.push(['Titlu','Locație','Tip contract','Poziții','Fee','Valoare (RON)','Status','Data deschidere']);
    (cl.projects||[]).forEach(p=>{
      rows.push([
        p.title,
        p.location,
        p.contractType,
        p.openings,
        p.fee,
        p.projectValue,
        p.status,
        fmtDate(p.openedAt)
      ]);
    });

    const csv = rows.map(r=>r.map(value=>`"${String(value ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`client_${cl.id}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function editClient(cl){
    const cityOptions = Object.keys(CITY_COORDS).sort();
    mainContent.innerHTML=`
      <div class="card">
        <button class="btn ghost" id="back_client"><i data-lucide="arrow-left"></i> Înapoi la profil</button>
      </div>
      <div class="card">
        <h2>Editează ${cl.name}</h2>
        <p class="muted">Actualizează detaliile de bază, contactele și informațiile financiare.</p>
        <div class="grid-two" style="margin-top:20px;gap:20px;">
          <div>
            <label>Nume companie
              <input id="edit_name" class="input" value="${cl.name}">
            </label>
            <label>Domeniu activitate
              <input id="edit_industry" class="input" value="${cl.industry}">
            </label>
            <label>Website companie
              <input id="edit_website" class="input" value="${cl.website || ''}">
            </label>
            <label>Număr angajați
              <input id="edit_size" class="input" value="${cl.size || ''}">
            </label>
            <label>Telefon companie
              <input id="edit_phone" class="input" value="${cl.phone || ''}">
            </label>
            <label>Termene plată
              <input id="edit_terms" class="input" value="${cl.paymentTerms || ''}">
            </label>
            <label>Notițe
              <textarea id="edit_notes" class="input" rows="3">${cl.notes || ''}</textarea>
            </label>
          </div>
          <div>
            <label>Țară
              <input id="edit_country" class="input" value="${cl.country}">
            </label>
            <label>Oraș principal
              <select id="edit_city" class="input">
                ${cityOptions.map(city=>`<option value="${city}" ${cl.city===city?'selected':''}>${city}</option>`).join('')}
              </select>
            </label>
            <label>Adresă sediu
              <input id="edit_address" class="input" value="${cl.address || ''}">
            </label>
            <label>CUI / VAT
              <input id="edit_vat" class="input" value="${cl.vat || ''}">
            </label>
            <label>Persoană contact
              <input id="edit_contact_name" class="input" value="${cl.contact?.name || ''}">
            </label>
            <label>Rol contact
              <input id="edit_contact_role" class="input" value="${cl.contact?.role || ''}">
            </label>
            <label>Email contact
              <input id="edit_contact_email" class="input" value="${cl.contact?.email || ''}">
            </label>
            <label>Telefon contact
              <input id="edit_contact_phone" class="input" value="${cl.contact?.phone || ''}">
            </label>
          </div>
        </div>
        <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap;">
          <button class="btn" id="save_edit"><i data-lucide="save"></i> Salvează</button>
          <button class="btn ghost" id="cancel_edit"><i data-lucide="x"></i> Anulează</button>
        </div>
      </div>
    `;

    document.getElementById('back_client').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('cancel_edit').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('save_edit').addEventListener('click',()=>{
      cl.name = document.getElementById('edit_name').value.trim() || cl.name;
      cl.industry = document.getElementById('edit_industry').value.trim() || cl.industry;
      cl.website = document.getElementById('edit_website').value.trim();
      cl.size = document.getElementById('edit_size').value.trim();
      cl.phone = document.getElementById('edit_phone').value.trim();
      cl.paymentTerms = document.getElementById('edit_terms').value.trim();
      cl.notes = document.getElementById('edit_notes').value.trim();
      cl.country = document.getElementById('edit_country').value.trim() || cl.country;
      cl.city = document.getElementById('edit_city').value;
      cl.address = document.getElementById('edit_address').value.trim();
      cl.vat = document.getElementById('edit_vat').value.trim();
      cl.contact = {
        name: document.getElementById('edit_contact_name').value.trim(),
        role: document.getElementById('edit_contact_role').value.trim(),
        email: document.getElementById('edit_contact_email').value.trim(),
        phone: document.getElementById('edit_contact_phone').value.trim()
      };
      if(cl.locations && cl.locations[0]){
        cl.locations[0].city = cl.city;
        cl.locations[0].address = cl.address;
        cl.locations[0].label = cl.locations[0].label || `Sediu ${cl.city}`;
        cl.locations[0].lat = geocode(cl.city).lat;
        cl.locations[0].lng = geocode(cl.city).lng;
      }
      cl.updatedAt = new Date().toISOString();
      save(STORAGE_KEY, dbClients);
      alert('Profil client actualizat.');
      openClient(cl.id);
    });
    if (window.lucide) { lucide.createIcons(); }
  }

  function addLocation(cl){
    const cityOptions = Object.keys(CITY_COORDS).sort();
    mainContent.innerHTML=`
      <div class="card">
        <button class="btn ghost" id="back_client"><i data-lucide="arrow-left"></i> Înapoi la ${cl.name}</button>
      </div>
      <div class="card">
        <h2>Locație nouă</h2>
        <p class="muted">Adaugă un punct operațional pentru a-l vedea pe hartă și în filtrele de potrivire candidați.</p>
        <div class="grid-two" style="margin-top:20px;gap:20px;">
          <label>Nume locație
            <input id="loc_label" class="input" placeholder="Ex: Depozit Ploiești">
          </label>
          <label>Oraș
            <select id="loc_city" class="input">
              ${cityOptions.map(city=>`<option value="${city}">${city}</option>`).join('')}
            </select>
          </label>
          <label>Adresă completă
            <input id="loc_address" class="input" placeholder="Stradă, număr, județ">
          </label>
          <label>Județ
            <input id="loc_county" class="input" placeholder="Ex: Prahova">
          </label>
          <label>Roluri active
            <input id="loc_roles" class="input" placeholder="Separă prin virgulă">
          </label>
        </div>
        <div style="margin-top:20px;display:flex;gap:12px;">
          <button class="btn" id="save_location"><i data-lucide="save"></i> Salvează locația</button>
          <button class="btn ghost" id="cancel_location"><i data-lucide="x"></i> Anulează</button>
        </div>
      </div>
    `;

    document.getElementById('back_client').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('cancel_location').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('save_location').addEventListener('click',()=>{
      const label = document.getElementById('loc_label').value.trim();
      const city = document.getElementById('loc_city').value;
      const address = document.getElementById('loc_address').value.trim();
      if(!label || !city || !address){
        alert('Completează numele, orașul și adresa locației.');
        return;
      }
      const coords = geocode(city);
      cl.locations = cl.locations || [];
      cl.locations.push({
        id: 'loc-'+shortId(),
        label,
        address,
        city,
        county: document.getElementById('loc_county').value.trim(),
        lat: coords.lat,
        lng: coords.lng,
        activeRoles: document.getElementById('loc_roles').value.split(',').map(x=>x.trim()).filter(Boolean)
      });
      cl.updatedAt = new Date().toISOString();
      save(STORAGE_KEY, dbClients);
      alert('Locație adăugată.');
      openClient(cl.id);
    });
    if (window.lucide) { lucide.createIcons(); }
  }

  function addProject(cl){
    if(!cl.locations?.length){
      alert('Adaugă mai întâi o locație pentru a crea proiecte asociate.');
      return;
    }
    mainContent.innerHTML=`
      <div class="card">
        <button class="btn ghost" id="back_client"><i data-lucide="arrow-left"></i> Înapoi la ${cl.name}</button>
      </div>
      <div class="card">
        <h2>Proiect nou pentru ${cl.name}</h2>
        <p class="muted">Definește rolul, taxa și locația pentru noul proiect în pipeline.</p>
        <div class="grid-two" style="margin-top:20px;gap:20px;">
          <label>Rol / Titlu poziție
            <input id="proj_title" class="input" placeholder="Ex: Inginer service">
          </label>
          <label>Locație proiect
            <select id="proj_location" class="input">
              ${cl.locations.map(loc=>`<option value="${loc.id}">${loc.label} (${loc.city})</option>`).join('')}
            </select>
          </label>
          <label>Număr poziții
            <input id="proj_openings" class="input" type="number" min="1" value="1">
          </label>
          <label>Fee (%)
            <input id="proj_fee" class="input" placeholder="Ex: 18%">
          </label>
          <label>Valoare proiect (RON)
            <input id="proj_value" class="input" type="number" min="0" step="1000" placeholder="Ex: 45000">
          </label>
          <label>Tip contract
            <input id="proj_contract" class="input" placeholder="Ex: Permanent">
          </label>
          <label>Status
            <select id="proj_status" class="input">
              <option>Deschis</option>
              <option>Interviu</option>
              <option>Ofertă</option>
              <option>Angajat</option>
              <option>Închis</option>
            </select>
          </label>
          <label>Tag-uri
            <input id="proj_tags" class="input" placeholder="Separă cu virgulă (ex: Logistică, Senior)">
          </label>
        </div>
        <label style="display:block;margin-top:18px;">Detalii suplimentare
          <textarea id="proj_notes" class="input" rows="3" placeholder="Context rol, cerințe, beneficii"></textarea>
        </label>
        <div style="margin-top:20px;display:flex;gap:12px;">
          <button class="btn" id="save_project"><i data-lucide="save"></i> Salvează proiect</button>
          <button class="btn ghost" id="cancel_project"><i data-lucide="x"></i> Anulează</button>
        </div>
      </div>
    `;

    document.getElementById('back_client').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('cancel_project').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('save_project').addEventListener('click',()=>{
      const title = document.getElementById('proj_title').value.trim();
      const locationId = document.getElementById('proj_location').value;
      if(!title || !locationId){
        alert('Completează titlul rolului și selectează o locație.');
        return;
      }
      const openings = parseInt(document.getElementById('proj_openings').value,10) || 1;
      const fee = document.getElementById('proj_fee').value.trim() || '15%';
      const value = parseFloat(document.getElementById('proj_value').value) || 0;
      const location = cl.locations.find(l=>l.id===locationId);
      const project = {
        id: 'proj-'+shortId(),
        title,
        locationId,
        location: location?.label || '',
        openings,
        fee,
        projectValue: value,
        contractType: document.getElementById('proj_contract').value.trim() || 'Permanent',
        status: document.getElementById('proj_status').value,
        openedAt: new Date().toISOString(),
        tags: document.getElementById('proj_tags').value.split(',').map(x=>x.trim()).filter(Boolean),
        notes: document.getElementById('proj_notes').value.trim()
      };
      cl.projects = cl.projects || [];
      cl.projects.unshift(project);
      cl.updatedAt = new Date().toISOString();
      save(STORAGE_KEY, dbClients);
      alert('Proiect adăugat în pipeline.');
      openClient(cl.id);
    });
    if (window.lucide) { lucide.createIcons(); }
  }

  function exportClient(cl){
    const rows=[
      ['Client', 'Industrie', 'Manager', 'Email manager', 'Contact', 'Email contact', 'Telefon contact', 'Locații', 'Proiecte active', 'Valoare pipeline (RON)', 'Propuneri', 'Plasări']
    ];
    rows.push([
      cl.name,
      cl.industry,
      cl.owner?.name || '',
      cl.owner?.email || '',
      cl.contact?.name || '',
      cl.contact?.email || '',
      cl.contact?.phone || '',
      (cl.locations||[]).map(loc=>`${loc.label} (${loc.city})`).join(' | '),
      (cl.projects||[]).map(p=>`${p.title} (${p.openings || 0} poziții, ${p.fee})`).join(' | '),
      sumProjectsValue(cl),
      cl.proposed?.length || 0,
      cl.placements?.length || 0
    ]);

    rows.push([]);
    rows.push(['Proiecte detaliat']);
    rows.push(['Titlu','Locație','Tip contract','Poziții','Fee','Valoare (RON)','Status','Data deschidere']);
    (cl.projects||[]).forEach(p=>{
      rows.push([
        p.title,
        p.location,
        p.contractType,
        p.openings,
        p.fee,
        p.projectValue,
        p.status,
        fmtDate(p.openedAt)
      ]);
    });

    const csv = rows.map(r=>r.map(value=>`"${String(value ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`client_${cl.id}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function editClient(cl){
    const cityOptions = Object.keys(CITY_COORDS).sort();
    mainContent.innerHTML=`
      <div class="card">
        <button class="btn ghost" id="back_client"><i data-lucide="arrow-left"></i> Înapoi la profil</button>
      </div>
      <div class="card">
        <h2>Editează ${cl.name}</h2>
        <p class="muted">Actualizează detaliile de bază, contactele și informațiile financiare.</p>
        <div class="grid-two" style="margin-top:20px;gap:20px;">
          <div>
            <label>Nume companie
              <input id="edit_name" class="input" value="${cl.name}">
            </label>
            <label>Domeniu activitate
              <input id="edit_industry" class="input" value="${cl.industry}">
            </label>
            <label>Website companie
              <input id="edit_website" class="input" value="${cl.website || ''}">
            </label>
            <label>Număr angajați
              <input id="edit_size" class="input" value="${cl.size || ''}">
            </label>
            <label>Telefon companie
              <input id="edit_phone" class="input" value="${cl.phone || ''}">
            </label>
            <label>Termene plată
              <input id="edit_terms" class="input" value="${cl.paymentTerms || ''}">
            </label>
            <label>Notițe
              <textarea id="edit_notes" class="input" rows="3">${cl.notes || ''}</textarea>
            </label>
          </div>
          <div>
            <label>Țară
              <input id="edit_country" class="input" value="${cl.country}">
            </label>
            <label>Oraș principal
              <select id="edit_city" class="input">
                ${cityOptions.map(city=>`<option value="${city}" ${cl.city===city?'selected':''}>${city}</option>`).join('')}
              </select>
            </label>
            <label>Adresă sediu
              <input id="edit_address" class="input" value="${cl.address || ''}">
            </label>
            <label>CUI / VAT
              <input id="edit_vat" class="input" value="${cl.vat || ''}">
            </label>
            <label>Persoană contact
              <input id="edit_contact_name" class="input" value="${cl.contact?.name || ''}">
            </label>
            <label>Rol contact
              <input id="edit_contact_role" class="input" value="${cl.contact?.role || ''}">
            </label>
            <label>Email contact
              <input id="edit_contact_email" class="input" value="${cl.contact?.email || ''}">
            </label>
            <label>Telefon contact
              <input id="edit_contact_phone" class="input" value="${cl.contact?.phone || ''}">
            </label>
          </div>
        </div>
        <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap;">
          <button class="btn" id="save_edit"><i data-lucide="save"></i> Salvează</button>
          <button class="btn ghost" id="cancel_edit"><i data-lucide="x"></i> Anulează</button>
        </div>
      </div>
    `;

    document.getElementById('back_client').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('cancel_edit').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('save_edit').addEventListener('click',()=>{
      cl.name = document.getElementById('edit_name').value.trim() || cl.name;
      cl.industry = document.getElementById('edit_industry').value.trim() || cl.industry;
      cl.website = document.getElementById('edit_website').value.trim();
      cl.size = document.getElementById('edit_size').value.trim();
      cl.phone = document.getElementById('edit_phone').value.trim();
      cl.paymentTerms = document.getElementById('edit_terms').value.trim();
      cl.notes = document.getElementById('edit_notes').value.trim();
      cl.country = document.getElementById('edit_country').value.trim() || cl.country;
      cl.city = document.getElementById('edit_city').value;
      cl.address = document.getElementById('edit_address').value.trim();
      cl.vat = document.getElementById('edit_vat').value.trim();
      cl.contact = {
        name: document.getElementById('edit_contact_name').value.trim(),
        role: document.getElementById('edit_contact_role').value.trim(),
        email: document.getElementById('edit_contact_email').value.trim(),
        phone: document.getElementById('edit_contact_phone').value.trim()
      };
      if(cl.locations && cl.locations[0]){
        cl.locations[0].city = cl.city;
        cl.locations[0].address = cl.address;
        cl.locations[0].label = cl.locations[0].label || `Sediu ${cl.city}`;
        cl.locations[0].lat = geocode(cl.city).lat;
        cl.locations[0].lng = geocode(cl.city).lng;
      }
      cl.updatedAt = new Date().toISOString();
      save(STORAGE_KEY, dbClients);
      alert('Profil client actualizat.');
      openClient(cl.id);
    });
    if (window.lucide) { lucide.createIcons(); }
  }

  function addLocation(cl){
    const cityOptions = Object.keys(CITY_COORDS).sort();
    mainContent.innerHTML=`
      <div class="card">
        <button class="btn ghost" id="back_client"><i data-lucide="arrow-left"></i> Înapoi la ${cl.name}</button>
      </div>
      <div class="card">
        <h2>Locație nouă</h2>
        <p class="muted">Adaugă un punct operațional pentru a-l vedea pe hartă și în filtrele de potrivire candidați.</p>
        <div class="grid-two" style="margin-top:20px;gap:20px;">
          <label>Nume locație
            <input id="loc_label" class="input" placeholder="Ex: Depozit Ploiești">
          </label>
          <label>Oraș
            <select id="loc_city" class="input">
              ${cityOptions.map(city=>`<option value="${city}">${city}</option>`).join('')}
            </select>
          </label>
          <label>Adresă completă
            <input id="loc_address" class="input" placeholder="Stradă, număr, județ">
          </label>
          <label>Județ
            <input id="loc_county" class="input" placeholder="Ex: Prahova">
          </label>
          <label>Roluri active
            <input id="loc_roles" class="input" placeholder="Separă prin virgulă">
          </label>
        </div>
        <div style="margin-top:20px;display:flex;gap:12px;">
          <button class="btn" id="save_location"><i data-lucide="save"></i> Salvează locația</button>
          <button class="btn ghost" id="cancel_location"><i data-lucide="x"></i> Anulează</button>
        </div>
      </div>
    `;

    document.getElementById('back_client').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('cancel_location').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('save_location').addEventListener('click',()=>{
      const label = document.getElementById('loc_label').value.trim();
      const city = document.getElementById('loc_city').value;
      const address = document.getElementById('loc_address').value.trim();
      if(!label || !city || !address){
        alert('Completează numele, orașul și adresa locației.');
        return;
      }
      const coords = geocode(city);
      cl.locations = cl.locations || [];
      cl.locations.push({
        id: 'loc-'+shortId(),
        label,
        address,
        city,
        county: document.getElementById('loc_county').value.trim(),
        lat: coords.lat,
        lng: coords.lng,
        activeRoles: document.getElementById('loc_roles').value.split(',').map(x=>x.trim()).filter(Boolean)
      });
      cl.updatedAt = new Date().toISOString();
      save(STORAGE_KEY, dbClients);
      alert('Locație adăugată.');
      openClient(cl.id);
    });
    if (window.lucide) { lucide.createIcons(); }
  }

  function addProject(cl){
    if(!cl.locations?.length){
      alert('Adaugă mai întâi o locație pentru a crea proiecte asociate.');
      return;
    }
    mainContent.innerHTML=`
      <div class="card">
        <button class="btn ghost" id="back_client"><i data-lucide="arrow-left"></i> Înapoi la ${cl.name}</button>
      </div>
      <div class="card">
        <h2>Proiect nou pentru ${cl.name}</h2>
        <p class="muted">Definește rolul, taxa și locația pentru noul proiect în pipeline.</p>
        <div class="grid-two" style="margin-top:20px;gap:20px;">
          <label>Rol / Titlu poziție
            <input id="proj_title" class="input" placeholder="Ex: Inginer service">
          </label>
          <label>Locație proiect
            <select id="proj_location" class="input">
              ${cl.locations.map(loc=>`<option value="${loc.id}">${loc.label} (${loc.city})</option>`).join('')}
            </select>
          </label>
          <label>Număr poziții
            <input id="proj_openings" class="input" type="number" min="1" value="1">
          </label>
          <label>Fee (%)
            <input id="proj_fee" class="input" placeholder="Ex: 18%">
          </label>
          <label>Valoare proiect (RON)
            <input id="proj_value" class="input" type="number" min="0" step="1000" placeholder="Ex: 45000">
          </label>
          <label>Tip contract
            <input id="proj_contract" class="input" placeholder="Ex: Permanent">
          </label>
          <label>Status
            <select id="proj_status" class="input">
              <option>Deschis</option>
              <option>Interviu</option>
              <option>Ofertă</option>
              <option>Angajat</option>
              <option>Închis</option>
            </select>
          </label>
          <label>Tag-uri
            <input id="proj_tags" class="input" placeholder="Separă cu virgulă (ex: Logistică, Senior)">
          </label>
        </div>
        <label style="display:block;margin-top:18px;">Detalii suplimentare
          <textarea id="proj_notes" class="input" rows="3" placeholder="Context rol, cerințe, beneficii"></textarea>
        </label>
        <div style="margin-top:20px;display:flex;gap:12px;">
          <button class="btn" id="save_project"><i data-lucide="save"></i> Salvează proiect</button>
          <button class="btn ghost" id="cancel_project"><i data-lucide="x"></i> Anulează</button>
        </div>
      </div>
    `;

    document.getElementById('back_client').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('cancel_project').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('save_project').addEventListener('click',()=>{
      const title = document.getElementById('proj_title').value.trim();
      const locationId = document.getElementById('proj_location').value;
      if(!title || !locationId){
        alert('Completează titlul rolului și selectează o locație.');
        return;
      }
      const openings = parseInt(document.getElementById('proj_openings').value,10) || 1;
      const fee = document.getElementById('proj_fee').value.trim() || '15%';
      const value = parseFloat(document.getElementById('proj_value').value) || 0;
      const location = cl.locations.find(l=>l.id===locationId);
      const project = {
        id: 'proj-'+shortId(),
        title,
        locationId,
        location: location?.label || '',
        openings,
        fee,
        projectValue: value,
        contractType: document.getElementById('proj_contract').value.trim() || 'Permanent',
        status: document.getElementById('proj_status').value,
        openedAt: new Date().toISOString(),
        tags: document.getElementById('proj_tags').value.split(',').map(x=>x.trim()).filter(Boolean),
        notes: document.getElementById('proj_notes').value.trim()
      };
      cl.projects = cl.projects || [];
      cl.projects.unshift(project);
      cl.updatedAt = new Date().toISOString();
      save(STORAGE_KEY, dbClients);
      alert('Proiect adăugat în pipeline.');
      openClient(cl.id);
    });
    if (window.lucide) { lucide.createIcons(); }
  }

  // ---------- Add proposed candidate ----------
  function addProposed(cl){
    if(!dbCandidates.length){
      alert('Nu există candidați în baza de date. Adaugă mai întâi candidați pentru a-i propune către clienți.');
      return;
    }
    const opts=dbCandidates.map(c=>`<option value="${c.id}">${c.firstName} ${c.lastName} — ${c.title}</option>`).join('');
    const projectsOptions = cl.projects?.length ? cl.projects.map(p=>`<option value="${p.id}">${p.title}</option>`).join('') : '';
    mainContent.innerHTML=`
      <div class="card">
        <h2>Propune candidat către ${cl.name}</h2>
        <p class="muted">Selectează candidatul și etapa curentă pentru a-l trimite către client.</p>
        <div class="grid-two" style="margin-top:16px;">
          <label>Candidat
            <select id="cand_sel" class="input">${opts}</select>
          </label>
          <label>Etapă
            <select id="cand_stage" class="input">
              <option>Propus</option><option>Interviu</option><option>Ofertă</option><option>Angajat</option><option>Respins</option>
            </select>
          </label>
          ${projectsOptions ? `<label>Proiect asociat<select id="cand_project" class="input">${projectsOptions}</select></label>` : ''}
        </div>
        <label style="display:block;margin-top:16px;">Mesaj către client
          <textarea id="cand_note" class="input" rows="3" placeholder="Rezumat profil, disponibilitate, așteptări salariale"></textarea>
        </label>
        <div style="margin-top:18px;display:flex;gap:12px;">
          <button class="btn" id="save_prop">Salvează</button>
          <button class="btn ghost" id="cancel_prop">Renunță</button>
        </div>
      </div>
    `;
    document.getElementById('cancel_prop').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('save_prop').addEventListener('click',()=>{
      const candId=document.getElementById('cand_sel').value;
      const stage=document.getElementById('cand_stage').value;
      const cand=dbCandidates.find(x=>x.id===candId);
      if(!cand){alert('Alege un candidat');return;}

      const note = document.getElementById('cand_note').value.trim();
      const projectId = document.getElementById('cand_project')?.value || null;
      const project = cl.projects?.find(p=>p.id===projectId);
      const now = new Date().toISOString();

      const p={
        id:'p-'+shortId(),
        candId,
        name:`${cand.firstName} ${cand.lastName}`,
        title:cand.title,
        stage,
        projectId,
        projectTitle: project?.title,
        note,
        addedAt: now
      };
      cl.proposed = cl.proposed || [];
      cl.proposed.unshift(p);
      if(stage === 'Angajat'){
        cl.placements = cl.placements || [];
        cl.placements.push(Object.assign({}, p));
      }
      cl.activities = cl.activities || [];
      cl.activities.unshift({ id: 'act-'+shortId(), when: now, who: activeUser.name, note: `Propus ${p.name} (${p.title}) în etapa ${stage}${project ? ' • '+project.title : ''}` });
      cl.updatedAt = now;
      save(STORAGE_KEY,dbClients);

      // adăugăm în istoric candidat
      cand.history = cand.history || [];
      cand.history.push({when:now,who:activeUser.name,action:`Propus către ${cl.name} (${stage})`});
      const candDB=load(CAND_KEY) || {};
      candDB.candidates=dbCandidates;
      save(CAND_KEY,candDB);

      openClient(cl.id);
      alert('Candidat propus către client');
    });
    if (window.lucide) { lucide.createIcons(); }
  }

  // Auto open clients if active
  function schedule(fn, payload){
    setTimeout(() => {
      try {
        fn(payload);
      } catch (err) {
        console.error('Eroare modul clienți:', err);
      }
    }, 0);
  }

  function placeholderVisible() {
    if (!mainContent || mainContent.dataset.view !== 'clients') return false;
    const heading = mainContent.querySelector('.glass-card h2');
    if (!heading) return false;
    return heading.textContent?.includes('Sincronizare companii partenere');
  }

  if (placeholderVisible()) {
    schedule(renderList);
    setTimeout(() => {
      if (placeholderVisible()) {
        schedule(renderList);
      }
    }, 220);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const active = document.querySelector('.nav button.active');
    if (active && active.dataset.view === 'clients') {
      schedule(renderList);
    }
  });

  document.addEventListener('iwf:view-change', (event) => {
    if (event?.detail?.view === 'clients') {
      schedule(renderList);
    }
  });

  window.IWF_CLIENTS = {
    openList: () => schedule(renderList),
    openClient: (id) => schedule(openClient, id),
    createClient: () => schedule(createClient)
  };
})();
