export type CircuitFilter = 'both' | 'pulmonary' | 'systemic';

export type OxygenState = 'oxygenated' | 'deoxygenated' | 'exchange';

export type PartId =
  | 'right_atrium'
  | 'right_ventricle'
  | 'left_atrium'
  | 'left_ventricle'
  | 'pulmonary_artery'
  | 'pulmonary_veins'
  | 'aorta'
  | 'vena_cava'
  | 'lungs'
  | 'body_capillaries';

export interface AnatomicalPart {
  id: PartId;
  titleAr: string;
  titleFr: string;
  circuit: CircuitFilter;
  circuitLabelAr: string;
  circuitLabelFr: string;
  oxygenState: OxygenState;
  oxygenLabelAr: string;
  oxygenLabelFr: string;
  descriptionAr: string;
  keyFactAr: string;
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
  labelAnchor: [number, number, number];
  requiresCutaway?: boolean;
}

export interface TraceStation {
  step: number;
  partId: PartId;
  circuit: 'pulmonary' | 'systemic';
  titleAr: string;
  titleFr: string;
  actionAr: string;
  gasExchangeAr: string;
  oxygenState: OxygenState;
  markerPos: [number, number, number];
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
  requiresCutaway?: boolean;
}

export interface QuizQuestion {
  id: number;
  questionAr: string;
  questionFrHint: string;
  options: {
    id: string;
    textAr: string;
    textFr: string;
  }[];
  correctOptionId: string;
  explanationAr: string;
}

export const CHALLENGE_PART_ORDER: PartId[] = [
  'right_ventricle',
  'pulmonary_artery',
  'lungs',
  'pulmonary_veins',
  'left_atrium',
  'left_ventricle',
  'aorta',
  'vena_cava',
];

export const ALVEOLUS_INFO = {
  titleAr: 'السنخ الرئوي والتبادل الغازي',
  titleFr: 'Alvéole pulmonaire et échanges gazeux',
  descriptionAr:
    'عند الشهيق يمتلئ السنخ الرئوي بغاز الأكسجين (الكريات الخضراء)، فيعبر الجدار الرقيق إلى الكريات الحمراء ويحوّل الدم من أحمر قاتم إلى أحمر قانٍ، بينما يخرج ثاني أكسيد الكربون (الكريات الداكنة) مع الزفير.',
  unhealthyNoteAr:
    'تنبيه صحي: التدخين يترك ترسبات داكنة (قطران) على جدار الأسناخ الرئوية فيعيق دخول الأكسجين إلى الدم!',
};

export const TISSUE_CAPILLARY_INFO = {
  titleAr: 'التبادل في الشعيرات الدموية للأعضاء',
  titleFr: 'Échanges dans les capillaires des organes',
  descriptionAr:
    'في الدورة الكبرى يصل الدم الأحمر القاني إلى العضلات والأعضاء ليسلّم الخلايا غاز الأكسجين (O₂) والمغذيات (السكريات)، ويستلم منها غاز ثاني أكسيد الكربون (CO₂) والفضلات فيتحوّل لونه إلى أحمر قاتم.',
  unhealthyNoteAr:
    'تنبيه صحي: تراكم الدهون الزائدة يضيّق الشرايين الدقيقة فيُبطئ وصول الأكسجين والمغذيات إلى خلايا العضلات والدماغ.',
};

export const HEALTH_STATE_INFO = {
  healthy: {
    titleAr: 'جهاز دوران سليم (رياضة وتغذية متوازنة)',
    noteAr: 'الأوعية الدموية مفتوحة ومرنة، والرئتان نقيتان لتبادل غازي سريع وفعال.',
  },
  unhealthy: {
    titleAr: 'تأثير الدهون الزائدة والتدخين',
    noteAr:
      'تراكم الكوليسترول يضيّق الشريان الأبهر ويبطئ جريان الدم، بينما يُضعف التدخين الأسناخ الرئوية (الوقاية: الرياضة والأكل الصحي).',
  },
};

export const ANATOMICAL_PARTS: Record<PartId, AnatomicalPart> = {
  right_atrium: {
    id: 'right_atrium',
    titleAr: 'الأذين الأيمن',
    titleFr: 'Oreillette droite',
    circuit: 'systemic',
    circuitLabelAr: 'نهاية الدورة الكبرى',
    circuitLabelFr: 'Fin de la grande circulation',
    oxygenState: 'deoxygenated',
    oxygenLabelAr: 'دم قاتم (أحمر داكن) محمل بثاني أكسيد الكربون CO₂',
    oxygenLabelFr: 'Sang rouge sombre riche en CO₂',
    descriptionAr:
      'الحجرة العلوية اليمنى من عضلة القلب المجوفة. يستقبل الدم القاتم المحمل بثاني أكسيد الكربون العائد من أعضاء الجسم عبر الوريدين الأجوفين، ويدفعه نحو البطين الأيمن.',
    keyFactAr: 'تسمح الصمامات القلبية بمرور الدم من الأذين إلى البطين في اتجاه واحد فقط دون رجوعه إلى الخلف.',
    cameraPos: [-2.3, 1.25, 3.6],
    cameraTarget: [-0.42, 0.68, 0.22],
    labelAnchor: [-0.42, 0.92, 0.35],
    requiresCutaway: true,
  },
  right_ventricle: {
    id: 'right_ventricle',
    titleAr: 'البطين الأيمن',
    titleFr: 'Ventricule droit',
    circuit: 'pulmonary',
    circuitLabelAr: 'بداية الدورة الصغرى',
    circuitLabelFr: 'Début de la petite circulation',
    oxygenState: 'deoxygenated',
    oxygenLabelAr: 'دم قاتم (أحمر داكن) محمل بثاني أكسيد الكربون CO₂',
    oxygenLabelFr: 'Sang rouge sombre riche en CO₂',
    descriptionAr:
      'الحجرة السفلية اليمنى للقلب. ينقبض ليدفع الدم القاتم عبر الشريان الرئوي نحو الرئتين لتنقيته من غاز ثاني أكسيد الكربون.',
    keyFactAr: 'جداره العضلي أرقّ من جدار البطين الأيسر لأنه يضخ الدم إلى الرئتين القريبتين فقط.',
    cameraPos: [-2.1, 0.35, 3.6],
    cameraTarget: [-0.38, 0.05, 0.28],
    labelAnchor: [-0.38, 0.08, 0.48],
    requiresCutaway: true,
  },
  left_atrium: {
    id: 'left_atrium',
    titleAr: 'الأذين الأيسر',
    titleFr: 'Oreillette gauche',
    circuit: 'pulmonary',
    circuitLabelAr: 'نهاية الدورة الصغرى',
    circuitLabelFr: 'Fin de la petite circulation',
    oxygenState: 'oxygenated',
    oxygenLabelAr: 'دم قانٍ (أحمر) غني بالأكسجين O₂',
    oxygenLabelFr: 'Sang rouge vif riche en O₂',
    descriptionAr:
      'الحجرة العلوية اليسرى للقلب. يستقبل الدم القاني الغني بالأكسجين العائد من الرئتين عبر الأوردة الرئوية الأربع ويمرره إلى البطين الأيسر.',
    keyFactAr: 'يفصل الحاجز العضلي الأذين الأيسر عن الأذين الأيمن حتى لا يختلط الدم القاني بالدم القاتم.',
    cameraPos: [2.3, 1.25, 3.6],
    cameraTarget: [0.42, 0.68, 0.22],
    labelAnchor: [0.48, 0.92, 0.35],
    requiresCutaway: true,
  },
  left_ventricle: {
    id: 'left_ventricle',
    titleAr: 'البطين الأيسر',
    titleFr: 'Ventricule gauche',
    circuit: 'systemic',
    circuitLabelAr: 'بداية الدورة الكبرى',
    circuitLabelFr: 'Début de la grande circulation',
    oxygenState: 'oxygenated',
    oxygenLabelAr: 'دم قانٍ (أحمر) غني بالأكسجين O₂',
    oxygenLabelFr: 'Sang rouge vif riche en O₂',
    descriptionAr:
      'أقوى حجرة في القلب! ينقبض بقوة كبيرة لضخ الدم القاني الغني بالأكسجين والغذاء عبر الشريان الأبهر إلى كافة أنحاء الجسم.',
    keyFactAr: 'جداره العضلي هو الأكثر سمكاً في القلب لأن عليه دفع الدم في الدورة الكبرى إلى الدماغ والأطراف.',
    cameraPos: [2.2, 0.25, 3.6],
    cameraTarget: [0.38, -0.05, 0.28],
    labelAnchor: [0.44, 0.06, 0.48],
    requiresCutaway: true,
  },
  pulmonary_artery: {
    id: 'pulmonary_artery',
    titleAr: 'الشريان الرئوي',
    titleFr: 'Artère pulmonaire',
    circuit: 'pulmonary',
    circuitLabelAr: 'الدورة الدموية الصغرى',
    circuitLabelFr: 'Petite circulation',
    oxygenState: 'deoxygenated',
    oxygenLabelAr: 'دم قاتم (أحمر داكن) محمل بثاني أكسيد الكربون CO₂',
    oxygenLabelFr: 'Sang rouge sombre riche en CO₂',
    descriptionAr:
      'شريان يخرج من البطين الأيمن ويتفرع إلى فرعين لنقل الدم القاتم المحمل بثاني أكسيد الكربون إلى الرئتين.',
    keyFactAr: 'ملاحظة مهمة في الإيقاظ العلمي: الشريان ينقل الدم دائماً من القلب؛ والشريان الرئوي هو الشريان الوحيد الذي يحمل دماً قاتماً.',
    cameraPos: [0.0, 2.25, 4.4],
    cameraTarget: [0.0, 1.65, 0.2],
    labelAnchor: [-0.25, 1.52, 0.26],
  },
  pulmonary_veins: {
    id: 'pulmonary_veins',
    titleAr: 'الأوردة الرئوية',
    titleFr: 'Veines pulmonaires',
    circuit: 'pulmonary',
    circuitLabelAr: 'الدورة الدموية الصغرى',
    circuitLabelFr: 'Petite circulation',
    oxygenState: 'oxygenated',
    oxygenLabelAr: 'دم قانٍ (أحمر) غني بالأكسجين O₂',
    oxygenLabelFr: 'Sang rouge vif riche en O₂',
    descriptionAr:
      'أربعة أوعية دموية تعيد الدم الأحمر القاني الغني بالأكسجين من الرئتين إلى الأذين الأيسر للقلب.',
    keyFactAr: 'الوريد يعيد الدم دائماً إلى القلب؛ والأوردة الرئوية هي الأوردة الوحيدة التي تحمل دماً قانياً غنياً بالأكسجين.',
    cameraPos: [1.8, 2.0, 4.6],
    cameraTarget: [0.95, 1.25, 0.0],
    labelAnchor: [1.05, 1.25, 0.12],
  },
  aorta: {
    id: 'aorta',
    titleAr: 'الشريان الأبهر (الأورطي)',
    titleFr: "L'aorte",
    circuit: 'systemic',
    circuitLabelAr: 'الدورة الدموية الكبرى',
    circuitLabelFr: 'Grande circulation',
    oxygenState: 'oxygenated',
    oxygenLabelAr: 'دم قانٍ (أحمر) غني بالأكسجين O₂',
    oxygenLabelFr: 'Sang rouge vif riche en O₂',
    descriptionAr:
      'أكبر شريان في جسم الإنسان؛ يخرج من البطين الأيسر على شكل قوس ويتفرع ليوزع الدم الأحمر القاني المحمل بالأكسجين والمغذيات على كل أعضاء الجسم.',
    keyFactAr: 'تغذّي تفرعاته العلوية الدماغ والذراعين، بينما يمتد قوسه الهابط نحو الكبد والكليتين والعضلات.',
    cameraPos: [1.9, 1.05, 5.0],
    cameraTarget: [0.25, 0.45, -0.1],
    labelAnchor: [0.45, 1.85, 0.08],
  },
  vena_cava: {
    id: 'vena_cava',
    titleAr: 'الوريدان الأجوفان (العلوي والسفلي)',
    titleFr: 'Veines caves (supérieure et inférieure)',
    circuit: 'systemic',
    circuitLabelAr: 'الدورة الدموية الكبرى',
    circuitLabelFr: 'Grande circulation',
    oxygenState: 'deoxygenated',
    oxygenLabelAr: 'دم قاتم (أحمر داكن) محمل بثاني أكسيد الكربون CO₂',
    oxygenLabelFr: 'Sang rouge sombre riche en CO₂',
    descriptionAr:
      'أكبر وريدين في الجسم؛ يجمعان الدم القاتم المحمل بثاني أكسيد الكربون والفضلات من خلايا الجسم ويعيدانه إلى الأذين الأيمن.',
    keyFactAr: 'تحتوي الأوردة على صمامات داخلية تمنع عودة الدم إلى الأسفل بفعل الجاذبية.',
    cameraPos: [-2.1, 0.2, 5.0],
    cameraTarget: [-0.82, -0.45, 0.0],
    labelAnchor: [-0.82, -0.35, 0.08],
  },
  lungs: {
    id: 'lungs',
    titleAr: 'الرئتان والأسناخ الرئوية',
    titleFr: 'Poumons et alvéoles pulmonaires',
    circuit: 'pulmonary',
    circuitLabelAr: 'الدورة الدموية الصغرى',
    circuitLabelFr: 'Circulation pulmonaire',
    oxygenState: 'exchange',
    oxygenLabelAr: 'تبادل غازي: طرح CO₂ وأخذ O₂',
    oxygenLabelFr: 'Échanges gazeux : O₂ ↗ / CO₂ ↘',
    descriptionAr:
      'محطة التنقية الرئيسية! داخل الأسناخ الرئوية المحاطة بالشعيرات الدموية، يطرح الدم غاز ثاني أكسيد الكربون (مع الزفير) ويمتص الأكسجين (من الشهيق).',
    keyFactAr: 'هنا يتغيّر لون الدم من أحمر قاتم إلى أحمر قانٍ ناصع قبل عودته للقلب.',
    cameraPos: [0.0, 1.95, 5.2],
    cameraTarget: [0.0, 1.48, -0.15],
    labelAnchor: [-1.58, 2.15, 0.15],
  },
  body_capillaries: {
    id: 'body_capillaries',
    titleAr: 'أعضاء الجسم والشعيرات الدموية',
    titleFr: 'Organes et capillaires sanguins',
    circuit: 'systemic',
    circuitLabelAr: 'الدورة الدموية الكبرى',
    circuitLabelFr: 'Circulation systémique',
    oxygenState: 'exchange',
    oxygenLabelAr: 'تبادل خلوي: توزيع O₂ وأخذ CO₂',
    oxygenLabelFr: 'Échanges cellulaires : O₂ ↘ / CO₂ ↗',
    descriptionAr:
      'تمثل الدماغ والكليتين والعضلات وسائر أعضاء الجسم. تتفرع الشرايين إلى شعيرات دموية دقيقة لتسليم الأكسجين والغذاء للخلايا، واستلام ثاني أكسيد الكربون والفضلات.',
    keyFactAr: 'هنا يتحول الدم الأحمر القاني إلى دم أحمر قاتم بعد أن تستهلك الخلايا الأكسجين.',
    cameraPos: [0.0, -0.9, 5.4],
    cameraTarget: [0.0, -1.72, 0.0],
    labelAnchor: [0.0, -1.72, 0.65],
  },
};

export const TRACE_STATIONS: TraceStation[] = [
  {
    step: 1,
    partId: 'right_ventricle',
    circuit: 'pulmonary',
    titleAr: 'الانطلاق من البطين الأيمن',
    titleFr: 'Départ du ventricule droit',
    actionAr: 'ينقبض البطين الأيمن ويدفع الدم الأحمر القاتم المحمل بـ CO₂ نحو الأعلى.',
    gasExchangeAr: 'دم قاتم (أحمر داكن) محمل بـ CO₂',
    oxygenState: 'deoxygenated',
    markerPos: [-0.22, 0.18, 0.34],
    cameraPos: [-1.7, 0.55, 3.8],
    cameraTarget: [-0.22, 0.2, 0.22],
    requiresCutaway: true,
  },
  {
    step: 2,
    partId: 'pulmonary_artery',
    circuit: 'pulmonary',
    titleAr: 'المرور عبر الشريان الرئوي',
    titleFr: "Passage par l'artère pulmonaire",
    actionAr: 'يسير الدم القاتم في الشريان الرئوي ويتفرع يميناً ويساراً متجهاً إلى الرئتين.',
    gasExchangeAr: 'نقل الدم القاتم نحو الرئتين',
    oxygenState: 'deoxygenated',
    markerPos: [0.0, 1.48, 0.12],
    cameraPos: [0.0, 1.85, 4.3],
    cameraTarget: [0.0, 1.42, 0.08],
  },
  {
    step: 3,
    partId: 'lungs',
    circuit: 'pulmonary',
    titleAr: 'التبادل الغازي في الأسناخ الرئوية',
    titleFr: 'Échanges gazeux dans les alvéoles',
    actionAr: 'داخل الأسناخ الرئوية، يطرح الدم غاز CO₂ في الزفير ويتزود بالأكسجين O₂ من الشهيق.',
    gasExchangeAr: 'يتحول الدم من أحمر قاتم إلى أحمر قانٍ',
    oxygenState: 'exchange',
    markerPos: [1.46, 1.56, -0.14],
    cameraPos: [0.8, 2.1, 5.0],
    cameraTarget: [0.75, 1.55, -0.16],
  },
  {
    step: 4,
    partId: 'pulmonary_veins',
    circuit: 'pulmonary',
    titleAr: 'العودة عبر الأوردة الرئوية',
    titleFr: 'Retour par les veines pulmonaires',
    actionAr: 'يعود الدم الأحمر القاني الغني بالأكسجين من الرئتين نحو القلب عبر الأوردة الرئوية.',
    gasExchangeAr: 'دم قانٍ (أحمر) غني بالأكسجين O₂',
    oxygenState: 'oxygenated',
    markerPos: [0.92, 1.08, 0.04],
    cameraPos: [1.8, 1.55, 4.3],
    cameraTarget: [0.75, 1.05, 0.08],
  },
  {
    step: 5,
    partId: 'left_ventricle',
    circuit: 'systemic',
    titleAr: 'الأذين الأيسر فالبطين الأيسر',
    titleFr: 'Oreillette gauche → Ventricule gauche',
    actionAr: 'يدخل الدم القاني الأذين الأيسر ثم ينزل عبر الصمام إلى البطين الأيسر القوي لضخه للجسم.',
    gasExchangeAr: 'نهاية الدورة الصغرى وبداية الدورة الكبرى',
    oxygenState: 'oxygenated',
    markerPos: [0.36, 0.14, 0.34],
    cameraPos: [1.85, 0.5, 3.8],
    cameraTarget: [0.32, 0.2, 0.22],
    requiresCutaway: true,
  },
  {
    step: 6,
    partId: 'aorta',
    circuit: 'systemic',
    titleAr: 'الاندفاع في الشريان الأبهر',
    titleFr: "Propulsion dans l'aorte",
    actionAr: 'يندفع الدم الأحمر القاني عبر قوس الشريان الأبهر ليتوزع على الدماغ والعضلات وسائر الأعضاء.',
    gasExchangeAr: 'دم قانٍ (أحمر) غني بالأكسجين والغذاء',
    oxygenState: 'oxygenated',
    markerPos: [0.58, -0.5, -0.26],
    cameraPos: [2.1, 0.4, 4.8],
    cameraTarget: [0.28, -0.2, -0.15],
  },
  {
    step: 7,
    partId: 'body_capillaries',
    circuit: 'systemic',
    titleAr: 'التبادل في الشعيرات الدموية للأعضاء',
    titleFr: 'Échanges dans les capillaires des organes',
    actionAr: 'تسلم الشعيرات الدموية الأكسجين والغذاء للخلايا، وتأخذ منها CO₂ والفضلات فيصبح الدم قاتماً.',
    gasExchangeAr: 'يتحول الدم من أحمر قانٍ إلى أحمر قاتم',
    oxygenState: 'exchange',
    markerPos: [0.0, -1.72, 0.22],
    cameraPos: [0.0, -0.85, 5.2],
    cameraTarget: [0.0, -1.7, 0.0],
  },
  {
    step: 8,
    partId: 'vena_cava',
    circuit: 'systemic',
    titleAr: 'العودة عبر الوريدين الأجوفين إلى الأذين الأيمن',
    titleFr: 'Retour par les veines caves → Oreillette droite',
    actionAr: 'يصعد الدم الأحمر القاتم عبر الوريد الأجوف ليدخل الأذين الأيمن فتكتمل الدورة الكبرى.',
    gasExchangeAr: 'دم قاتم (أحمر داكن) يعود للقلب للتنقية',
    oxygenState: 'deoxygenated',
    markerPos: [-0.66, -0.45, -0.05],
    cameraPos: [-2.0, 0.2, 4.8],
    cameraTarget: [-0.55, -0.25, 0.04],
  },
];

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    questionAr: 'ما هو لون الدم القاني الغني بالأكسجين (O₂) في جسم الإنسان؟',
    questionFrHint: 'Couleur du sang riche en oxygène',
    options: [
      { id: 'a', textAr: 'أحمر قانٍ (ناصع)', textFr: 'Rouge vif' },
      { id: 'b', textAr: 'أحمر قاتم (داكن)', textFr: 'Rouge sombre' },
      { id: 'c', textAr: 'شفاف بلا لون', textFr: 'Incolore' },
    ],
    correctOptionId: 'a',
    explanationAr:
      'الدم الغني بغاز الأكسجين يكون لونه أحمر قانياً (ناصعاً)، بينما يصبح الدم المحمل بثاني أكسيد الكربون أحمر قاتماً (داكناً).',
  },
  {
    id: 2,
    questionAr: 'من أي حجرة في القلب تنطلق الدورة الدموية الصغرى (الرئوية)؟',
    questionFrHint: 'Départ de la petite circulation',
    options: [
      { id: 'a', textAr: 'البطين الأيسر', textFr: 'Ventricule gauche' },
      { id: 'b', textAr: 'البطين الأيمن', textFr: 'Ventricule droit' },
      { id: 'c', textAr: 'الأذين الأيسر', textFr: 'Oreillette gauche' },
    ],
    correctOptionId: 'b',
    explanationAr:
      'تنطلق الدورة الدموية الصغرى من البطين الأيمن الذي يضخ الدم القاتم عبر الشريان الرئوي نحو الرئتين.',
  },
  {
    id: 3,
    questionAr: 'أين يتم التبادل الغازي الحقيقي (طرح CO₂ وأخذ O₂) داخل الرئتين؟',
    questionFrHint: 'Lieu des échanges gazeux dans les poumons',
    options: [
      { id: 'a', textAr: 'في الأسناخ الرئوية والشعيرات الدموية', textFr: 'Les alvéoles et capillaires pulmonaires' },
      { id: 'b', textAr: 'في القصبة الهوائية فقط', textFr: 'La trachée uniquement' },
      { id: 'c', textAr: 'في الأذين الأيمن', textFr: "L'oreillette droite" },
    ],
    correctOptionId: 'a',
    explanationAr:
      'الأسناخ الرئوية محاطة بشبكة كثيفة من الشعيرات الدموية؛ عبر جدرانها الرقيقة يخرج CO₂ مع الزفير ويدخل O₂ إلى الدم.',
  },
  {
    id: 4,
    questionAr: 'ما اسم الوعاء الذي ينقل الدم القاني من البطين الأيسر إلى كافة أعضاء الجسم؟',
    questionFrHint: 'Artère principale de la grande circulation',
    options: [
      { id: 'a', textAr: 'الشريان الأبهر', textFr: "L'aorte" },
      { id: 'b', textAr: 'الوريد الأجوف', textFr: 'La veine cave' },
      { id: 'c', textAr: 'الشريان الرئوي', textFr: "L'artère pulmonaire" },
    ],
    correctOptionId: 'a',
    explanationAr:
      'الشريان الأبهر هو أكبر شريان في الجسم ويوزع الدم القاني المحمل بالأكسجين والغذاء في الدورة الدموية الكبرى.',
  },
  {
    id: 5,
    questionAr: 'ما هو دور الصمامات الموجودة داخل القلب؟',
    questionFrHint: 'Rôle des valves cardiaques',
    options: [
      { id: 'a', textAr: 'تسمح بمرور الدم في اتجاه واحد وتمنع رجوعه', textFr: 'Assurer un sens unique au sang' },
      { id: 'b', textAr: 'تنتج غاز الأكسجين داخل القلب', textFr: "Produire de l'oxygène" },
      { id: 'c', textAr: 'تصل البطين الأيمن بالبطين الأيسر', textFr: 'Relier les deux ventricules' },
    ],
    correctOptionId: 'a',
    explanationAr:
      'تفصل الصمامات بين الأذينين والبطينين (ومخارج الشرايين) وتسمح بتدفق الدم في اتجاه واحد فقط.',
  },
  {
    id: 6,
    questionAr: 'لماذا يكون جدار البطين الأيسر أكثر سمكاً من جدار البطين الأيمن؟',
    questionFrHint: 'Épaisseur de la paroi du ventricule gauche',
    options: [
      { id: 'a', textAr: 'لأنه يضخ الدم إلى كافة أنحاء الجسم البعيدة', textFr: 'Il propulse le sang dans tout le corps' },
      { id: 'b', textAr: 'لأنه يضخ الدم إلى الرئتين فقط', textFr: 'Il envoie le sang aux poumons seulement' },
      { id: 'c', textAr: 'لأنه يستقبل الدم من الوريد الأجوف', textFr: 'Il reçoit le sang des veines caves' },
    ],
    correctOptionId: 'a',
    explanationAr:
      'يحتاج البطين الأيسر إلى عضلة سميكة وقوية لدفع الدم عبر الدورة الكبرى إلى الدماغ والأطراف، بينما يضخ البطين الأيمن إلى الرئتين القريبتين فقط.',
  },
  {
    id: 7,
    questionAr: 'أي الأوعية التالية يعيد الدم القاتم (المحمل بـ CO₂) من أعضاء الجسم إلى الأذين الأيمن؟',
    questionFrHint: 'Retour du sang sombre vers le cœur droit',
    options: [
      { id: 'a', textAr: 'الأوردة الرئوية', textFr: 'Veines pulmonaires' },
      { id: 'b', textAr: 'الوريدان الأجوفان', textFr: 'Veines caves' },
      { id: 'c', textAr: 'الشريان الأبهر', textFr: "L'aorte" },
    ],
    correctOptionId: 'b',
    explanationAr:
      'يعود الدم القاتم المحمل بثاني أكسيد الكربون في نهاية الدورة الكبرى عبر الوريدين الأجوفين العلوي والسفلي ليصب في الأذين الأيمن.',
  },
  {
    id: 8,
    questionAr: 'ماذا يحدث لنبض القلب عند ممارسة الرياضة والجري؟',
    questionFrHint: "Effet de l'effort physique sur le rythme cardiaque",
    options: [
      { id: 'a', textAr: 'يتسارع نبض القلب لتزويد العضلات بمزيد من الأكسجين', textFr: 'Il accélère pour fournir plus d’O₂' },
      { id: 'b', textAr: 'ينخفض نبض القلب ويتوقف التنفس', textFr: 'Il ralentit' },
      { id: 'c', textAr: 'يتحول الدم القاني إلى دم قاتم قبل الوصول للعضلات', textFr: 'Le sang change avant les muscles' },
    ],
    correctOptionId: 'a',
    explanationAr:
      'أثناء المجهود البدني تزداد حاجة العضلات للأكسجين والغذاء، فتتسارع نبضات القلب لزيادة سرعة دوران الدم.',
  },
];
