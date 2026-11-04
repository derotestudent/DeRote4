/**
 * Comprehensive Indian & Partner Schools Directory
 * Provides standardized school suggestions with city and board tags.
 */

export interface SchoolEntry {
  id: string;
  name: string;
  city: string;
  state: string;
  board?: 'CBSE' | 'ICSE' | 'State' | 'IB' | 'Cambridge';
}

export const POPULAR_SCHOOLS: SchoolEntry[] = [
  {
    id: 'dps_rkpuram',
    name: 'Delhi Public School, R.K. Puram',
    city: 'New Delhi',
    state: 'Delhi',
    board: 'CBSE',
  },
  {
    id: 'nps_indiranagar',
    name: 'National Public School, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    board: 'CBSE',
  },
  {
    id: 'st_xaviers_fort',
    name: "St. Xavier's High School",
    city: 'Mumbai',
    state: 'Maharashtra',
    board: 'State',
  },
  {
    id: 'dps_mathuraroad',
    name: 'Delhi Public School, Mathura Road',
    city: 'New Delhi',
    state: 'Delhi',
    board: 'CBSE',
  },
  {
    id: 'bombay_scottish',
    name: 'Bombay Scottish School, Mahim',
    city: 'Mumbai',
    state: 'Maharashtra',
    board: 'ICSE',
  },
  {
    id: 'dps_vasantkunj',
    name: 'Delhi Public School, Vasant Kunj',
    city: 'New Delhi',
    state: 'Delhi',
    board: 'CBSE',
  },
  {
    id: 'nps_koramangala',
    name: 'National Public School, Koramangala',
    city: 'Bengaluru',
    state: 'Karnataka',
    board: 'CBSE',
  },
  {
    id: 'modern_school_barakhamba',
    name: 'Modern School, Barakhamba Road',
    city: 'New Delhi',
    state: 'Delhi',
    board: 'CBSE',
  },
  {
    id: 'mothers_international',
    name: "The Mother's International School",
    city: 'New Delhi',
    state: 'Delhi',
    board: 'CBSE',
  },
  {
    id: 'bishop_cotton_boys',
    name: "Bishop Cotton Boys' School",
    city: 'Bengaluru',
    state: 'Karnataka',
    board: 'ICSE',
  },
  {
    id: 'bishop_cotton_girls',
    name: "Bishop Cotton Girls' School",
    city: 'Bengaluru',
    state: 'Karnataka',
    board: 'ICSE',
  },
  {
    id: 'sanskriti_school',
    name: 'Sanskriti School, Chanakyapuri',
    city: 'New Delhi',
    state: 'Delhi',
    board: 'CBSE',
  },
  {
    id: 'dhirubhai_ambani',
    name: 'Dhirubhai Ambani International School',
    city: 'Mumbai',
    state: 'Maharashtra',
    board: 'IB',
  },
  {
    id: 'the_doon_school',
    name: 'The Doon School',
    city: 'Dehradun',
    state: 'Uttarakhand',
    board: 'ICSE',
  },
  {
    id: 'scindia_school',
    name: 'The Scindia School',
    city: 'Gwalior',
    state: 'Madhya Pradesh',
    board: 'CBSE',
  },
  {
    id: 'loreto_house',
    name: 'Loreto House, Middleton Row',
    city: 'Kolkata',
    state: 'West Bengal',
    board: 'ICSE',
  },
  {
    id: 'la_martiniere_boys',
    name: 'La Martiniere for Boys',
    city: 'Kolkata',
    state: 'West Bengal',
    board: 'ICSE',
  },
  {
    id: 'la_martiniere_girls',
    name: 'La Martiniere for Girls',
    city: 'Kolkata',
    state: 'West Bengal',
    board: 'ICSE',
  },
  {
    id: 'dps_noida',
    name: 'Delhi Public School, Noida',
    city: 'Noida',
    state: 'Uttar Pradesh',
    board: 'CBSE',
  },
  {
    id: 'dps_rohini',
    name: 'Delhi Public School, Rohini',
    city: 'New Delhi',
    state: 'Delhi',
    board: 'CBSE',
  },
  {
    id: 'dps_dwarka',
    name: 'Delhi Public School, Dwarka',
    city: 'New Delhi',
    state: 'Delhi',
    board: 'CBSE',
  },
  {
    id: 'dps_gurgaon_45',
    name: 'Delhi Public School, Sector 45',
    city: 'Gurugram',
    state: 'Haryana',
    board: 'CBSE',
  },
  {
    id: 'springdales_dhaula_kuan',
    name: 'Springdales School, Dhaula Kuan',
    city: 'New Delhi',
    state: 'Delhi',
    board: 'CBSE',
  },
  {
    id: 'springdales_pusa_road',
    name: 'Springdales School, Pusa Road',
    city: 'New Delhi',
    state: 'Delhi',
    board: 'CBSE',
  },
  {
    id: 'st_stephens_chandigarh',
    name: "St. Stephen's School",
    city: 'Chandigarh',
    state: 'Chandigarh',
    board: 'ICSE',
  },
  {
    id: 'kv_iit_powai',
    name: 'Kendriya Vidyalaya, IIT Powai',
    city: 'Mumbai',
    state: 'Maharashtra',
    board: 'CBSE',
  },
  {
    id: 'kv_asc_centre',
    name: 'Kendriya Vidyalaya, ASC Centre',
    city: 'Bengaluru',
    state: 'Karnataka',
    board: 'CBSE',
  },
  {
    id: 'kv_jnu_newdelhi',
    name: 'Kendriya Vidyalaya, JNU Campus',
    city: 'New Delhi',
    state: 'Delhi',
    board: 'CBSE',
  },
  {
    id: 'dav_chennai',
    name: 'D.A.V. Boys Senior Secondary School, Gopalapuram',
    city: 'Chennai',
    state: 'Tamil Nadu',
    board: 'CBSE',
  },
  {
    id: 'psbb_chennai',
    name: 'Padma Seshadri Bala Bhavan (PSBB), Nungambakkam',
    city: 'Chennai',
    state: 'Tamil Nadu',
    board: 'CBSE',
  },
  {
    id: 'the_heritage_school_gurgaon',
    name: 'The Heritage School',
    city: 'Gurugram',
    state: 'Haryana',
    board: 'CBSE',
  },
  {
    id: 'vvs_rajajinagar',
    name: 'Vidyavardhaka Sangha (VVS)',
    city: 'Bengaluru',
    state: 'Karnataka',
    board: 'State',
  },
  {
    id: 'loyola_school_jamshedpur',
    name: 'Loyola School',
    city: 'Jamshedpur',
    state: 'Jharkhand',
    board: 'ICSE',
  },
  {
    id: 'st_marys_hyderabad',
    name: "St. Mary's High School",
    city: 'Hyderabad',
    state: 'Telangana',
    board: 'State',
  },
  {
    id: 'hyderabad_public_school',
    name: 'The Hyderabad Public School, Begumpet',
    city: 'Hyderabad',
    state: 'Telangana',
    board: 'ICSE',
  },
  {
    id: 'campbell_cambridge',
    name: 'Cambridge International School',
    city: 'Pune',
    state: 'Maharashtra',
    board: 'Cambridge',
  },
];

/**
 * Searches the schools bank for names, cities, or boards matching the user's input.
 */
export function searchSchools(query: string, limit: number = 6): SchoolEntry[] {
  const clean = query.trim().toLowerCase();
  if (!clean || clean.length < 1) {
    return POPULAR_SCHOOLS.slice(0, limit);
  }

  // Exact startsWith matches first, then includes matches
  const startsWithMatches: SchoolEntry[] = [];
  const includesMatches: SchoolEntry[] = [];

  for (const school of POPULAR_SCHOOLS) {
    const nameLower = school.name.toLowerCase();
    const cityLower = school.city.toLowerCase();

    if (nameLower.startsWith(clean)) {
      startsWithMatches.push(school);
    } else if (nameLower.includes(clean) || cityLower.includes(clean)) {
      includesMatches.push(school);
    }
  }

  return [...startsWithMatches, ...includesMatches].slice(0, limit);
}
