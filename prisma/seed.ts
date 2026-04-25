import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL in environment variables");
}

const adapter = new PrismaMariaDb(databaseUrl);
const prisma = new PrismaClient({ adapter });

type SeedMuscle = {
  name: string;
  slug: string;
  groupKey: string;
};

type SeedExercise = {
  name: string;
  measureType: "reps" | "duration";
};

const activityTypes = [
  { slug: "strength", name: "Fuerza", sortOrder: 1 },
  { slug: "running", name: "Running", sortOrder: 2 },
  { slug: "trail_running", name: "Trail running", sortOrder: 3 },
  { slug: "cycling", name: "Ciclismo", sortOrder: 4 },
  { slug: "indoor_cycling", name: "Spinning", sortOrder: 5 },
  { slug: "swimming", name: "Natación", sortOrder: 6 },
  { slug: "walking_trekking", name: "Caminata / Trekking", sortOrder: 7 },
  { slug: "yoga_pilates", name: "Yoga / Pilates", sortOrder: 8 },
  { slug: "hiit_functional", name: "HIIT / Funcional", sortOrder: 9 },
  { slug: "rowing", name: "Remo", sortOrder: 10 },
  { slug: "climbing", name: "Escalada", sortOrder: 11 },
  { slug: "martial_arts", name: "Artes marciales", sortOrder: 12 },
  { slug: "dance", name: "Danza", sortOrder: 13 },
  { slug: "elliptical", name: "Elíptico", sortOrder: 14 },
  { slug: "ski_snowboard", name: "Ski / Snowboard", sortOrder: 15 },
  { slug: "water_sports", name: "Deportes acuáticos", sortOrder: 16 },
  { slug: "calisthenics", name: "Calistenia", sortOrder: 17 },
  { slug: "crossfit", name: "CrossFit", sortOrder: 18 },
  { slug: "skating", name: "Patinaje", sortOrder: 19 },
];

const muscles: SeedMuscle[] = [
  { name: "Abdominales", slug: "abdominales", groupKey: "core" },
  { name: "Oblicuos", slug: "oblicuos", groupKey: "core" },
  { name: "Lumbar", slug: "lumbar", groupKey: "core" },

  { name: "Cuádriceps", slug: "cuadriceps", groupKey: "legs" },
  { name: "Isquiotibiales", slug: "isquiotibiales", groupKey: "legs" },
  { name: "Glúteos", slug: "gluteos", groupKey: "legs" },
  { name: "Aductores", slug: "aductores", groupKey: "legs" },
  { name: "Gemelos", slug: "gemelos", groupKey: "legs" },

  { name: "Pecho", slug: "pecho", groupKey: "chest" },
  { name: "Hombros", slug: "hombros", groupKey: "shoulders" },
  { name: "Tríceps", slug: "triceps", groupKey: "arms" },
  { name: "Bíceps", slug: "biceps", groupKey: "arms" },
  { name: "Antebrazo", slug: "antebrazo", groupKey: "arms" },

  { name: "Espalda", slug: "espalda", groupKey: "back" },
  { name: "Trapecio", slug: "trapecio", groupKey: "back" },
];

const exercises: SeedExercise[] = [
  // pecho
  { name: "Press de Banca", measureType: "reps" },
  { name: "Press Inclinado", measureType: "reps" },
  { name: "Press Declinado", measureType: "reps" },
  { name: "Aperturas con Mancuernas", measureType: "reps" },
  { name: "Fondos Pecho", measureType: "reps" },
  { name: "Lagartijas", measureType: "reps" },
  { name: "Lagartijas Inclinadas", measureType: "reps" },

  // espalda
  { name: "Dominadas", measureType: "reps" },
  { name: "Jalón al Pecho", measureType: "reps" },
  { name: "Remo con Barra", measureType: "reps" },
  { name: "Remo con Mancuerna", measureType: "reps" },
  { name: "Remo Sentado", measureType: "reps" },
  { name: "Pull Over", measureType: "reps" },
  { name: "Peso Muerto", measureType: "reps" },

  // hombros
  { name: "Press Militar", measureType: "reps" },
  { name: "Elevaciones Laterales", measureType: "reps" },
  { name: "Elevaciones Frontales", measureType: "reps" },
  { name: "Pájaros", measureType: "reps" },
  { name: "Arnold Press", measureType: "reps" },
  { name: "Face Pull", measureType: "reps" },

  // bíceps / antebrazo
  { name: "Curl de Bíceps", measureType: "reps" },
  { name: "Curl Martillo", measureType: "reps" },
  { name: "Curl Inverso", measureType: "reps" },
  { name: "Curl Concentrado", measureType: "reps" },
  { name: "Curl Inclinado", measureType: "reps" },
  { name: "Curl Predicador", measureType: "reps" },
  { name: "Farmer Carry", measureType: "duration" },

  // tríceps
  { name: "Press Francés", measureType: "reps" },
  { name: "Extensión de Tríceps en Polea", measureType: "reps" },
  { name: "Rompecráneos", measureType: "reps" },
  { name: "Fondos Tríceps", measureType: "reps" },
  { name: "Extensión por Encima de la Cabeza", measureType: "reps" },

  // piernas
  { name: "Sentadillas", measureType: "reps" },
  { name: "Sentadilla Frontal", measureType: "reps" },
  { name: "Prensa", measureType: "reps" },
  { name: "Zancadas", measureType: "reps" },
  { name: "Bulgarian Split Squat", measureType: "reps" },
  { name: "Peso Muerto Rumano", measureType: "reps" },
  { name: "Hip Thrust", measureType: "reps" },
  { name: "Curl Femoral", measureType: "reps" },
  { name: "Extensión de Cuádriceps", measureType: "reps" },
  { name: "Elevación de Gemelos", measureType: "reps" },
  { name: "Step Ups", measureType: "reps" },
  { name: "Buenos Días", measureType: "reps" },

  // core
  { name: "Abdominales", measureType: "reps" },
  { name: "Crunch", measureType: "reps" },
  { name: "Elevación de Piernas", measureType: "reps" },
  { name: "Russian Twists", measureType: "reps" },
  { name: "Ab Wheel", measureType: "reps" },
  { name: "Dead Bug", measureType: "reps" },
  { name: "Mountain Climbers", measureType: "duration" },
  { name: "Plancha", measureType: "duration" },
  { name: "Plancha Lateral", measureType: "duration" },
  { name: "Hollow Hold", measureType: "duration" },
  { name: "Wall Sit", measureType: "duration" },
  { name: "Superman Hold", measureType: "duration" },

  // cardio / conditioning
  { name: "Correr", measureType: "duration" },
  { name: "Trote en Cinta", measureType: "duration" },
  { name: "Bicicleta Fija", measureType: "duration" },
  { name: "Elíptico", measureType: "duration" },
  { name: "Soga", measureType: "duration" },
  { name: "Remo Ergométrico", measureType: "duration" },
  { name: "Air Bike", measureType: "duration" },
  { name: "Caminata Inclinada", measureType: "duration" },
  { name: "Burpees", measureType: "reps" },
  { name: "Jumping Jacks", measureType: "duration" },
  { name: "Box Jumps", measureType: "reps" },
  { name: "Battle Ropes", measureType: "duration" },
  { name: "Kettlebell Swings", measureType: "reps" },

  // movilidad
  { name: "Movilidad de Cadera", measureType: "duration" },
  { name: "Movilidad de Hombros", measureType: "duration" },
  { name: "Movilidad de Tobillos", measureType: "duration" },
  { name: "Estiramiento de Isquios", measureType: "duration" },
  { name: "Estiramiento de Cuádriceps", measureType: "duration" },
  { name: "Movilidad Torácica", measureType: "duration" },

  // full body extra
  { name: "Thrusters", measureType: "reps" },
  { name: "Clean and Press", measureType: "reps" },
  { name: "Snatch con Mancuerna", measureType: "reps" },
];

const exerciseMappings: Record<
  string,
  { muscleSlug: string; percentage: number }[]
> = {
  "Press de Banca": [
    { muscleSlug: "pecho", percentage: 70 },
    { muscleSlug: "triceps", percentage: 20 },
    { muscleSlug: "hombros", percentage: 10 },
  ],
  "Press Inclinado": [
    { muscleSlug: "pecho", percentage: 60 },
    { muscleSlug: "hombros", percentage: 20 },
    { muscleSlug: "triceps", percentage: 20 },
  ],
  "Press Declinado": [
    { muscleSlug: "pecho", percentage: 70 },
    { muscleSlug: "triceps", percentage: 20 },
    { muscleSlug: "hombros", percentage: 10 },
  ],
  "Aperturas con Mancuernas": [
    { muscleSlug: "pecho", percentage: 80 },
    { muscleSlug: "hombros", percentage: 20 },
  ],
  "Fondos Pecho": [
    { muscleSlug: "pecho", percentage: 55 },
    { muscleSlug: "triceps", percentage: 30 },
    { muscleSlug: "hombros", percentage: 15 },
  ],
  Lagartijas: [
    { muscleSlug: "pecho", percentage: 55 },
    { muscleSlug: "triceps", percentage: 25 },
    { muscleSlug: "hombros", percentage: 20 },
  ],
  "Lagartijas Inclinadas": [
    { muscleSlug: "pecho", percentage: 55 },
    { muscleSlug: "triceps", percentage: 25 },
    { muscleSlug: "hombros", percentage: 20 },
  ],
  Dominadas: [
    { muscleSlug: "espalda", percentage: 55 },
    { muscleSlug: "biceps", percentage: 25 },
    { muscleSlug: "antebrazo", percentage: 20 },
  ],
  "Jalón al Pecho": [
    { muscleSlug: "espalda", percentage: 60 },
    { muscleSlug: "biceps", percentage: 25 },
    { muscleSlug: "antebrazo", percentage: 15 },
  ],
  "Remo con Barra": [
    { muscleSlug: "espalda", percentage: 55 },
    { muscleSlug: "trapecio", percentage: 20 },
    { muscleSlug: "biceps", percentage: 15 },
    { muscleSlug: "lumbar", percentage: 10 },
  ],
  "Remo con Mancuerna": [
    { muscleSlug: "espalda", percentage: 55 },
    { muscleSlug: "trapecio", percentage: 20 },
    { muscleSlug: "biceps", percentage: 15 },
    { muscleSlug: "lumbar", percentage: 10 },
  ],
  "Remo Sentado": [
    { muscleSlug: "espalda", percentage: 60 },
    { muscleSlug: "biceps", percentage: 20 },
    { muscleSlug: "trapecio", percentage: 20 },
  ],
  "Pull Over": [
    { muscleSlug: "espalda", percentage: 60 },
    { muscleSlug: "pecho", percentage: 20 },
    { muscleSlug: "triceps", percentage: 20 },
  ],
  "Peso Muerto": [
    { muscleSlug: "espalda", percentage: 25 },
    { muscleSlug: "lumbar", percentage: 20 },
    { muscleSlug: "gluteos", percentage: 20 },
    { muscleSlug: "isquiotibiales", percentage: 20 },
    { muscleSlug: "trapecio", percentage: 15 },
  ],
  "Press Militar": [
    { muscleSlug: "hombros", percentage: 65 },
    { muscleSlug: "triceps", percentage: 25 },
    { muscleSlug: "trapecio", percentage: 10 },
  ],
  "Elevaciones Laterales": [
    { muscleSlug: "hombros", percentage: 85 },
    { muscleSlug: "trapecio", percentage: 15 },
  ],
  "Elevaciones Frontales": [
    { muscleSlug: "hombros", percentage: 85 },
    { muscleSlug: "trapecio", percentage: 15 },
  ],
  Pájaros: [
    { muscleSlug: "hombros", percentage: 70 },
    { muscleSlug: "trapecio", percentage: 30 },
  ],
  "Arnold Press": [
    { muscleSlug: "hombros", percentage: 60 },
    { muscleSlug: "triceps", percentage: 25 },
    { muscleSlug: "trapecio", percentage: 15 },
  ],
  "Face Pull": [
    { muscleSlug: "hombros", percentage: 40 },
    { muscleSlug: "trapecio", percentage: 35 },
    { muscleSlug: "espalda", percentage: 25 },
  ],
  "Curl de Bíceps": [
    { muscleSlug: "biceps", percentage: 85 },
    { muscleSlug: "antebrazo", percentage: 15 },
  ],
  "Curl Martillo": [
    { muscleSlug: "biceps", percentage: 55 },
    { muscleSlug: "antebrazo", percentage: 45 },
  ],
  "Curl Inverso": [
    { muscleSlug: "antebrazo", percentage: 70 },
    { muscleSlug: "biceps", percentage: 30 },
  ],
  "Curl Concentrado": [
    { muscleSlug: "biceps", percentage: 85 },
    { muscleSlug: "antebrazo", percentage: 15 },
  ],
  "Curl Inclinado": [
    { muscleSlug: "biceps", percentage: 85 },
    { muscleSlug: "antebrazo", percentage: 15 },
  ],
  "Curl Predicador": [
    { muscleSlug: "biceps", percentage: 80 },
    { muscleSlug: "antebrazo", percentage: 20 },
  ],
  "Farmer Carry": [
    { muscleSlug: "antebrazo", percentage: 35 },
    { muscleSlug: "trapecio", percentage: 20 },
    { muscleSlug: "abdominales", percentage: 15 },
    { muscleSlug: "oblicuos", percentage: 10 },
    { muscleSlug: "gluteos", percentage: 10 },
    { muscleSlug: "hombros", percentage: 10 },
  ],
  "Press Francés": [
    { muscleSlug: "triceps", percentage: 90 },
    { muscleSlug: "hombros", percentage: 10 },
  ],
  "Extensión de Tríceps en Polea": [
    { muscleSlug: "triceps", percentage: 90 },
    { muscleSlug: "hombros", percentage: 10 },
  ],
  Rompecráneos: [
    { muscleSlug: "triceps", percentage: 90 },
    { muscleSlug: "hombros", percentage: 10 },
  ],
  "Fondos Tríceps": [
    { muscleSlug: "triceps", percentage: 70 },
    { muscleSlug: "pecho", percentage: 20 },
    { muscleSlug: "hombros", percentage: 10 },
  ],
  "Extensión por Encima de la Cabeza": [
    { muscleSlug: "triceps", percentage: 90 },
    { muscleSlug: "hombros", percentage: 10 },
  ],
  Sentadillas: [
    { muscleSlug: "cuadriceps", percentage: 45 },
    { muscleSlug: "gluteos", percentage: 25 },
    { muscleSlug: "isquiotibiales", percentage: 15 },
    { muscleSlug: "aductores", percentage: 10 },
    { muscleSlug: "abdominales", percentage: 5 },
  ],
  "Sentadilla Frontal": [
    { muscleSlug: "cuadriceps", percentage: 50 },
    { muscleSlug: "gluteos", percentage: 20 },
    { muscleSlug: "abdominales", percentage: 15 },
    { muscleSlug: "aductores", percentage: 10 },
    { muscleSlug: "isquiotibiales", percentage: 5 },
  ],
  Prensa: [
    { muscleSlug: "cuadriceps", percentage: 55 },
    { muscleSlug: "gluteos", percentage: 20 },
    { muscleSlug: "isquiotibiales", percentage: 15 },
    { muscleSlug: "aductores", percentage: 10 },
  ],
  Zancadas: [
    { muscleSlug: "cuadriceps", percentage: 35 },
    { muscleSlug: "gluteos", percentage: 30 },
    { muscleSlug: "isquiotibiales", percentage: 20 },
    { muscleSlug: "aductores", percentage: 10 },
    { muscleSlug: "gemelos", percentage: 5 },
  ],
  "Bulgarian Split Squat": [
    { muscleSlug: "cuadriceps", percentage: 35 },
    { muscleSlug: "gluteos", percentage: 30 },
    { muscleSlug: "isquiotibiales", percentage: 20 },
    { muscleSlug: "aductores", percentage: 10 },
    { muscleSlug: "abdominales", percentage: 5 },
  ],
  "Peso Muerto Rumano": [
    { muscleSlug: "isquiotibiales", percentage: 40 },
    { muscleSlug: "gluteos", percentage: 30 },
    { muscleSlug: "lumbar", percentage: 15 },
    { muscleSlug: "espalda", percentage: 10 },
    { muscleSlug: "antebrazo", percentage: 5 },
  ],
  "Hip Thrust": [
    { muscleSlug: "gluteos", percentage: 65 },
    { muscleSlug: "isquiotibiales", percentage: 20 },
    { muscleSlug: "abdominales", percentage: 10 },
    { muscleSlug: "cuadriceps", percentage: 5 },
  ],
  "Curl Femoral": [
    { muscleSlug: "isquiotibiales", percentage: 85 },
    { muscleSlug: "gemelos", percentage: 15 },
  ],
  "Extensión de Cuádriceps": [
    { muscleSlug: "cuadriceps", percentage: 90 },
    { muscleSlug: "aductores", percentage: 10 },
  ],
  "Elevación de Gemelos": [
    { muscleSlug: "gemelos", percentage: 90 },
    { muscleSlug: "isquiotibiales", percentage: 10 },
  ],
  "Step Ups": [
    { muscleSlug: "cuadriceps", percentage: 35 },
    { muscleSlug: "gluteos", percentage: 30 },
    { muscleSlug: "isquiotibiales", percentage: 15 },
    { muscleSlug: "gemelos", percentage: 10 },
    { muscleSlug: "abdominales", percentage: 10 },
  ],
  "Buenos Días": [
    { muscleSlug: "isquiotibiales", percentage: 35 },
    { muscleSlug: "gluteos", percentage: 30 },
    { muscleSlug: "lumbar", percentage: 20 },
    { muscleSlug: "espalda", percentage: 15 },
  ],
  Abdominales: [
    { muscleSlug: "abdominales", percentage: 80 },
    { muscleSlug: "oblicuos", percentage: 20 },
  ],
  Crunch: [
    { muscleSlug: "abdominales", percentage: 80 },
    { muscleSlug: "oblicuos", percentage: 20 },
  ],
  "Elevación de Piernas": [
    { muscleSlug: "abdominales", percentage: 65 },
    { muscleSlug: "oblicuos", percentage: 20 },
    { muscleSlug: "gluteos", percentage: 15 },
  ],
  "Russian Twists": [
    { muscleSlug: "oblicuos", percentage: 55 },
    { muscleSlug: "abdominales", percentage: 35 },
    { muscleSlug: "antebrazo", percentage: 10 },
  ],
  "Ab Wheel": [
    { muscleSlug: "abdominales", percentage: 50 },
    { muscleSlug: "oblicuos", percentage: 20 },
    { muscleSlug: "lumbar", percentage: 15 },
    { muscleSlug: "hombros", percentage: 15 },
  ],
  "Dead Bug": [
    { muscleSlug: "abdominales", percentage: 55 },
    { muscleSlug: "oblicuos", percentage: 25 },
    { muscleSlug: "gluteos", percentage: 20 },
  ],
  "Mountain Climbers": [
    { muscleSlug: "abdominales", percentage: 35 },
    { muscleSlug: "oblicuos", percentage: 20 },
    { muscleSlug: "hombros", percentage: 15 },
    { muscleSlug: "cuadriceps", percentage: 15 },
    { muscleSlug: "pecho", percentage: 15 },
  ],
  Plancha: [
    { muscleSlug: "abdominales", percentage: 45 },
    { muscleSlug: "oblicuos", percentage: 20 },
    { muscleSlug: "hombros", percentage: 15 },
    { muscleSlug: "gluteos", percentage: 10 },
    { muscleSlug: "lumbar", percentage: 10 },
  ],
  "Plancha Lateral": [
    { muscleSlug: "oblicuos", percentage: 45 },
    { muscleSlug: "abdominales", percentage: 25 },
    { muscleSlug: "hombros", percentage: 15 },
    { muscleSlug: "gluteos", percentage: 10 },
    { muscleSlug: "lumbar", percentage: 5 },
  ],
  "Hollow Hold": [
    { muscleSlug: "abdominales", percentage: 55 },
    { muscleSlug: "oblicuos", percentage: 20 },
    { muscleSlug: "gluteos", percentage: 15 },
    { muscleSlug: "lumbar", percentage: 10 },
  ],
  "Wall Sit": [
    { muscleSlug: "cuadriceps", percentage: 55 },
    { muscleSlug: "gluteos", percentage: 20 },
    { muscleSlug: "isquiotibiales", percentage: 10 },
    { muscleSlug: "gemelos", percentage: 10 },
    { muscleSlug: "abdominales", percentage: 5 },
  ],
  "Superman Hold": [
    { muscleSlug: "lumbar", percentage: 45 },
    { muscleSlug: "espalda", percentage: 25 },
    { muscleSlug: "gluteos", percentage: 20 },
    { muscleSlug: "trapecio", percentage: 10 },
  ],
  Correr: [
    { muscleSlug: "cuadriceps", percentage: 30 },
    { muscleSlug: "gemelos", percentage: 25 },
    { muscleSlug: "gluteos", percentage: 20 },
    { muscleSlug: "isquiotibiales", percentage: 15 },
    { muscleSlug: "abdominales", percentage: 10 },
  ],
  "Trote en Cinta": [
    { muscleSlug: "cuadriceps", percentage: 30 },
    { muscleSlug: "gemelos", percentage: 25 },
    { muscleSlug: "gluteos", percentage: 20 },
    { muscleSlug: "isquiotibiales", percentage: 15 },
    { muscleSlug: "abdominales", percentage: 10 },
  ],
  "Bicicleta Fija": [
    { muscleSlug: "cuadriceps", percentage: 35 },
    { muscleSlug: "gluteos", percentage: 25 },
    { muscleSlug: "isquiotibiales", percentage: 15 },
    { muscleSlug: "gemelos", percentage: 15 },
    { muscleSlug: "abdominales", percentage: 10 },
  ],
  Elíptico: [
    { muscleSlug: "cuadriceps", percentage: 25 },
    { muscleSlug: "gluteos", percentage: 20 },
    { muscleSlug: "isquiotibiales", percentage: 15 },
    { muscleSlug: "gemelos", percentage: 10 },
    { muscleSlug: "hombros", percentage: 15 },
    { muscleSlug: "espalda", percentage: 15 },
  ],
  Soga: [
    { muscleSlug: "gemelos", percentage: 35 },
    { muscleSlug: "cuadriceps", percentage: 20 },
    { muscleSlug: "hombros", percentage: 15 },
    { muscleSlug: "antebrazo", percentage: 10 },
    { muscleSlug: "abdominales", percentage: 10 },
    { muscleSlug: "gluteos", percentage: 10 },
  ],
  "Remo Ergométrico": [
    { muscleSlug: "espalda", percentage: 30 },
    { muscleSlug: "cuadriceps", percentage: 20 },
    { muscleSlug: "gluteos", percentage: 15 },
    { muscleSlug: "biceps", percentage: 15 },
    { muscleSlug: "trapecio", percentage: 10 },
    { muscleSlug: "abdominales", percentage: 10 },
  ],
  "Air Bike": [
    { muscleSlug: "cuadriceps", percentage: 20 },
    { muscleSlug: "gluteos", percentage: 15 },
    { muscleSlug: "hombros", percentage: 20 },
    { muscleSlug: "pecho", percentage: 10 },
    { muscleSlug: "espalda", percentage: 15 },
    { muscleSlug: "abdominales", percentage: 10 },
    { muscleSlug: "gemelos", percentage: 10 },
  ],
  "Caminata Inclinada": [
    { muscleSlug: "gluteos", percentage: 30 },
    { muscleSlug: "cuadriceps", percentage: 25 },
    { muscleSlug: "gemelos", percentage: 20 },
    { muscleSlug: "isquiotibiales", percentage: 15 },
    { muscleSlug: "abdominales", percentage: 10 },
  ],
  Burpees: [
    { muscleSlug: "pecho", percentage: 15 },
    { muscleSlug: "hombros", percentage: 15 },
    { muscleSlug: "triceps", percentage: 10 },
    { muscleSlug: "cuadriceps", percentage: 20 },
    { muscleSlug: "gluteos", percentage: 15 },
    { muscleSlug: "abdominales", percentage: 15 },
    { muscleSlug: "gemelos", percentage: 10 },
  ],
  "Jumping Jacks": [
    { muscleSlug: "gemelos", percentage: 25 },
    { muscleSlug: "cuadriceps", percentage: 20 },
    { muscleSlug: "hombros", percentage: 20 },
    { muscleSlug: "gluteos", percentage: 15 },
    { muscleSlug: "abdominales", percentage: 10 },
    { muscleSlug: "trapecio", percentage: 10 },
  ],
  "Box Jumps": [
    { muscleSlug: "cuadriceps", percentage: 35 },
    { muscleSlug: "gluteos", percentage: 30 },
    { muscleSlug: "gemelos", percentage: 20 },
    { muscleSlug: "isquiotibiales", percentage: 10 },
    { muscleSlug: "abdominales", percentage: 5 },
  ],
  "Battle Ropes": [
    { muscleSlug: "hombros", percentage: 30 },
    { muscleSlug: "trapecio", percentage: 20 },
    { muscleSlug: "antebrazo", percentage: 20 },
    { muscleSlug: "abdominales", percentage: 15 },
    { muscleSlug: "espalda", percentage: 15 },
  ],
  "Kettlebell Swings": [
    { muscleSlug: "gluteos", percentage: 30 },
    { muscleSlug: "isquiotibiales", percentage: 25 },
    { muscleSlug: "lumbar", percentage: 15 },
    { muscleSlug: "hombros", percentage: 10 },
    { muscleSlug: "abdominales", percentage: 10 },
    { muscleSlug: "antebrazo", percentage: 10 },
  ],
  "Movilidad de Cadera": [
    { muscleSlug: "gluteos", percentage: 35 },
    { muscleSlug: "aductores", percentage: 25 },
    { muscleSlug: "isquiotibiales", percentage: 20 },
    { muscleSlug: "cuadriceps", percentage: 20 },
  ],
  "Movilidad de Hombros": [
    { muscleSlug: "hombros", percentage: 60 },
    { muscleSlug: "trapecio", percentage: 20 },
    { muscleSlug: "espalda", percentage: 20 },
  ],
  "Movilidad de Tobillos": [
    { muscleSlug: "gemelos", percentage: 60 },
    { muscleSlug: "cuadriceps", percentage: 20 },
    { muscleSlug: "isquiotibiales", percentage: 20 },
  ],
  "Estiramiento de Isquios": [
    { muscleSlug: "isquiotibiales", percentage: 80 },
    { muscleSlug: "lumbar", percentage: 20 },
  ],
  "Estiramiento de Cuádriceps": [
    { muscleSlug: "cuadriceps", percentage: 85 },
    { muscleSlug: "aductores", percentage: 15 },
  ],
  "Movilidad Torácica": [
    { muscleSlug: "espalda", percentage: 45 },
    { muscleSlug: "trapecio", percentage: 25 },
    { muscleSlug: "hombros", percentage: 20 },
    { muscleSlug: "lumbar", percentage: 10 },
  ],
  Thrusters: [
    { muscleSlug: "cuadriceps", percentage: 25 },
    { muscleSlug: "gluteos", percentage: 20 },
    { muscleSlug: "hombros", percentage: 25 },
    { muscleSlug: "triceps", percentage: 10 },
    { muscleSlug: "abdominales", percentage: 10 },
    { muscleSlug: "pecho", percentage: 10 },
  ],
  "Clean and Press": [
    { muscleSlug: "hombros", percentage: 20 },
    { muscleSlug: "trapecio", percentage: 20 },
    { muscleSlug: "gluteos", percentage: 15 },
    { muscleSlug: "cuadriceps", percentage: 15 },
    { muscleSlug: "espalda", percentage: 10 },
    { muscleSlug: "abdominales", percentage: 10 },
    { muscleSlug: "antebrazo", percentage: 10 },
  ],
  "Snatch con Mancuerna": [
    { muscleSlug: "hombros", percentage: 20 },
    { muscleSlug: "trapecio", percentage: 20 },
    { muscleSlug: "gluteos", percentage: 20 },
    { muscleSlug: "cuadriceps", percentage: 15 },
    { muscleSlug: "espalda", percentage: 10 },
    { muscleSlug: "abdominales", percentage: 10 },
    { muscleSlug: "antebrazo", percentage: 5 },
  ],
};

const awardDefinitions = [
  {
    code: "EL_PERSISTENTE_L1",
    name: "El Persistente I",
    description:
      "Metiste al menos 1 entrenamiento de fuerza por semana durante 3 semanas consecutivas.",
    scope: "profile",
    pointsBonus: 0,
    iconKey: "el-persistente",
    category: "consistency",
    level: 1,
    criteria: {
      kind: "activity_type_week_streak",
      activityType: "gym", // "gym" is the legacy type for strength/calisthenics
      minPerWeek: 1,
      target: 3,
    },
  },
  {
    code: "EL_PERSISTENTE_L2",
    name: "El Persistente II",
    description:
      "Metiste al menos 1 entrenamiento de fuerza por semana durante 5 semanas consecutivas.",
    scope: "profile",
    pointsBonus: 0,
    iconKey: "el-persistente",
    category: "consistency",
    level: 2,
    criteria: {
      kind: "activity_type_week_streak",
      activityType: "gym",
      minPerWeek: 1,
      target: 5,
    },
  },
  {
    code: "EL_PERSISTENTE_L3",
    name: "El Persistente III",
    description:
      "Metiste al menos 1 entrenamiento de fuerza por semana durante 8 semanas consecutivas.",
    scope: "profile",
    pointsBonus: 0,
    iconKey: "el-persistente",
    category: "consistency",
    level: 3,
    criteria: {
      kind: "activity_type_week_streak",
      activityType: "gym",
      minPerWeek: 1,
      target: 8,
    },
  },
  {
    code: "strength_RAT_L1",
    name: "strength Rat I",
    description: "Lograste una racha de 3 semanas perfectas consecutivas.",
    scope: "profile",
    pointsBonus: 0,
    iconKey: "strength-rat",
    category: "consistency",
    level: 1,
    criteria: {
      kind: "perfect_week_streak",
      target: 3,
    },
  },
  {
    code: "strength_RAT_L2",
    name: "strength Rat II",
    description: "Lograste una racha de 5 semanas perfectas consecutivas.",
    scope: "profile",
    pointsBonus: 0,
    iconKey: "strength-rat",
    category: "consistency",
    level: 2,
    criteria: {
      kind: "perfect_week_streak",
      target: 5,
    },
  },
  {
    code: "strength_RAT_L3",
    name: "strength Rat III",
    description: "Lograste una racha de 8 semanas perfectas consecutivas.",
    scope: "profile",
    pointsBonus: 0,
    iconKey: "strength-rat",
    category: "consistency",
    level: 3,
    criteria: {
      kind: "perfect_week_streak",
      target: 8,
    },
  },
  {
    code: "IMPARABLE_L1",
    name: "Imparable",
    description: "Entrenaste durante 3 fines de semana consecutivos.",
    scope: "profile",
    pointsBonus: 0,
    iconKey: "imparable",
    category: "consistency",
    level: 1,
    criteria: {
      kind: "weekend_activity_streak",
      target: 3,
    },
  },
  {
    code: "CORRE_FORREST_L1",
    name: "Corre Forrest I",
    description:
      "Metiste al menos un entrenamiento de running por semana durante 3 semanas consecutivas.",
    scope: "profile",
    pointsBonus: 0,
    iconKey: "corre-forrest",
    category: "running",
    level: 1,
    criteria: {
      kind: "activity_type_week_streak",
      activityType: "run",
      minPerWeek: 1,
      target: 3,
    },
  },
  {
    code: "CORRE_FORREST_L2",
    name: "Corre Forrest II",
    description:
      "Metiste al menos un entrenamiento de running por semana durante 5 semanas consecutivas.",
    scope: "profile",
    pointsBonus: 0,
    iconKey: "corre-forrest",
    category: "running",
    level: 2,
    criteria: {
      kind: "activity_type_week_streak",
      activityType: "run",
      minPerWeek: 1,
      target: 5,
    },
  },
  {
    code: "CORRE_FORREST_L3",
    name: "Corre Forrest III",
    description:
      "Metiste al menos un entrenamiento de running por semana durante 8 semanas consecutivas.",
    scope: "profile",
    pointsBonus: 0,
    iconKey: "corre-forrest",
    category: "running",
    level: 3,
    criteria: {
      kind: "activity_type_week_streak",
      activityType: "run",
      minPerWeek: 1,
      target: 8,
    },
  },
  {
    code: "EL_PIERNAS_L1",
    name: "El Piernas",
    description:
      "Hiciste al menos 8 entrenamientos con piernas involucradas en una ventana de 30 días.",
    scope: "profile",
    pointsBonus: 0,
    iconKey: "el-piernas",
    category: "muscle",
    level: 1,
    criteria: {
      kind: "muscle_group_activities_rolling_days",
      muscleGroup: "legs",
      target: 8,
      daysWindow: 30,
    },
  },
  {
    code: "SIX_PACK_L1",
    name: "Six Pack",
    description:
      "Hiciste al menos 8 entrenamientos con abdominales o core involucrado en una ventana de 30 días.",
    scope: "profile",
    pointsBonus: 0,
    iconKey: "six-pack",
    category: "muscle",
    level: 1,
    criteria: {
      kind: "muscle_group_activities_rolling_days",
      muscleGroup: "core",
      target: 8,
      daysWindow: 30,
    },
  },
  {
    code: "TODOTERRENO_L1",
    name: "Todoterreno",
    description:
      "Entrenaste 4 tipos distintos de actividad a lo largo de una misma temporada.",
    scope: "season",
    pointsBonus: 0,
    iconKey: "todoterreno",
    category: "variety",
    level: 1,
    criteria: {
      kind: "distinct_activity_types_in_season",
      target: 4,
      allowedTypes: [
        "strength",
        "running",
        "trail_running",
        "cycling",
        "indoor_cycling",
        "swimming",
        "walking_trekking",
        "yoga_pilates",
        "hiit_functional",
        "rowing",
        "climbing",
        "martial_arts",
        "dance",
        "elliptical",
        "ski_snowboard",
        "water_sports",
        "calisthenics",
        "crossfit",
        "skating",
      ],
    },
  },
  // ── Consistency: consecutive active weeks (any type) ──────────────────────
  {
    code: "EL_CONSTANTE_L1",
    name: "El Constante I",
    description: "Entrenaste al menos 1 vez por semana durante 4 semanas consecutivas.",
    scope: "profile",
    pointsBonus: 0,
    iconKey: "el-constante",
    category: "consistency",
    level: 1,
    criteria: { kind: "consecutive_weeks_any_activity", target: 4 },
  },
  {
    code: "EL_CONSTANTE_L2",
    name: "El Constante II",
    description: "Entrenaste al menos 1 vez por semana durante 8 semanas consecutivas.",
    scope: "profile",
    pointsBonus: 0,
    iconKey: "el-constante",
    category: "consistency",
    level: 2,
    criteria: { kind: "consecutive_weeks_any_activity", target: 8 },
  },
  {
    code: "EL_CONSTANTE_L3",
    name: "El Constante III",
    description: "Entrenaste al menos 1 vez por semana durante 16 semanas consecutivas.",
    scope: "profile",
    pointsBonus: 0,
    iconKey: "el-constante",
    category: "consistency",
    level: 3,
    criteria: { kind: "consecutive_weeks_any_activity", target: 16 },
  },
  // ── Consistency: weekend streaks (extended tiers) ─────────────────────────
  {
    code: "IMPARABLE_L2",
    name: "Imparable II",
    description: "Entrenaste durante 5 fines de semana consecutivos.",
    scope: "profile",
    pointsBonus: 0,
    iconKey: "imparable",
    category: "consistency",
    level: 2,
    criteria: { kind: "weekend_activity_streak", target: 5 },
  },
  {
    code: "IMPARABLE_L3",
    name: "Imparable III",
    description: "Entrenaste durante 8 fines de semana consecutivos.",
    scope: "profile",
    pointsBonus: 0,
    iconKey: "imparable",
    category: "consistency",
    level: 3,
    criteria: { kind: "weekend_activity_streak", target: 8 },
  },
  // ── Recovery / balance: mobility streaks ─────────────────────────────────
  {
    code: "EL_MOVIMIENTO_L1",
    name: "El Movimiento I",
    description:
      "Metiste al menos 1 actividad de movilidad por semana durante 3 semanas consecutivas.",
    scope: "profile",
    pointsBonus: 0,
    iconKey: "el-movimiento",
    category: "recovery",
    level: 1,
    criteria: {
      kind: "activity_type_week_streak",
      activityType: "mobility",
      minPerWeek: 1,
      target: 3,
    },
  },
  {
    code: "EL_MOVIMIENTO_L2",
    name: "El Movimiento II",
    description:
      "Metiste al menos 1 actividad de movilidad por semana durante 5 semanas consecutivas.",
    scope: "profile",
    pointsBonus: 0,
    iconKey: "el-movimiento",
    category: "recovery",
    level: 2,
    criteria: {
      kind: "activity_type_week_streak",
      activityType: "mobility",
      minPerWeek: 1,
      target: 5,
    },
  },
  // ── Volume milestones ─────────────────────────────────────────────────────
  {
    code: "DEBUT_L1",
    name: "¡Debut!",
    description: "Registraste tu primer entrenamiento. ¡El comienzo de algo grande!",
    scope: "profile",
    pointsBonus: 0,
    iconKey: "debut",
    category: "milestone",
    level: 1,
    criteria: { kind: "total_activities_milestone", target: 1 },
  },
  {
    code: "VETERANO_L1",
    name: "Veterano I",
    description: "Completaste 25 entrenamientos registrados.",
    scope: "profile",
    pointsBonus: 0,
    iconKey: "veterano",
    category: "milestone",
    level: 1,
    criteria: { kind: "total_activities_milestone", target: 25 },
  },
  {
    code: "VETERANO_L2",
    name: "Veterano II",
    description: "Completaste 50 entrenamientos registrados.",
    scope: "profile",
    pointsBonus: 0,
    iconKey: "veterano",
    category: "milestone",
    level: 2,
    criteria: { kind: "total_activities_milestone", target: 50 },
  },
  {
    code: "EL_CENTENARIO_L1",
    name: "El Centenario",
    description: "Completaste 100 entrenamientos registrados. Leyenda.",
    scope: "profile",
    pointsBonus: 0,
    iconKey: "el-centenario",
    category: "milestone",
    level: 3,
    criteria: { kind: "total_activities_milestone", target: 100 },
  },
  // ── Variety: season-scoped extended tiers ────────────────────────────────
  {
    code: "TODOTERRENO_L2",
    name: "Todoterreno II",
    description: "Entrenaste 6 tipos distintos de actividad a lo largo de una misma temporada.",
    scope: "season",
    pointsBonus: 0,
    iconKey: "todoterreno",
    category: "variety",
    level: 2,
    criteria: { kind: "distinct_activity_types_in_season", target: 6 },
  },
  // ── Muscle: extended tiers ────────────────────────────────────────────────
  {
    code: "EL_PIERNAS_L2",
    name: "El Piernas II",
    description:
      "Hiciste al menos 12 entrenamientos con piernas involucradas en una ventana de 30 días.",
    scope: "profile",
    pointsBonus: 0,
    iconKey: "el-piernas",
    category: "muscle",
    level: 2,
    criteria: {
      kind: "muscle_group_activities_rolling_days",
      muscleGroup: "legs",
      target: 12,
      daysWindow: 30,
    },
  },
  {
    code: "SIX_PACK_L2",
    name: "Six Pack II",
    description:
      "Hiciste al menos 12 entrenamientos con core involucrado en una ventana de 30 días.",
    scope: "profile",
    pointsBonus: 0,
    iconKey: "six-pack",
    category: "muscle",
    level: 2,
    criteria: {
      kind: "muscle_group_activities_rolling_days",
      muscleGroup: "core",
      target: 12,
      daysWindow: 30,
    },
  },
] as const;

async function upsertActivityTypes() {
  for (const item of activityTypes) {
    await prisma.activityCategory.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        sortOrder: item.sortOrder,
        isActive: true,
      },
      create: {
        slug: item.slug,
        name: item.name,
        sortOrder: item.sortOrder,
        isActive: true,
      },
    });
  }
}

async function upsertMuscles() {
  for (const muscle of muscles) {
    await prisma.muscle.upsert({
      where: { slug: muscle.slug },
      update: {
        name: muscle.name,
        slug: muscle.slug,
        groupKey: muscle.groupKey,
      },
      create: {
        name: muscle.name,
        slug: muscle.slug,
        groupKey: muscle.groupKey,
      },
    });
  }
}

async function upsertExercises() {
  for (const exercise of exercises) {
    await prisma.exercise.upsert({
      where: { name: exercise.name },
      update: {
        name: exercise.name,
        measureType: exercise.measureType,
      },
      create: {
        name: exercise.name,
        measureType: exercise.measureType,
      },
    });
  }
}

async function syncExerciseMuscles() {
  const allMuscles = await prisma.muscle.findMany();
  const allExercises = await prisma.exercise.findMany();

  const muscleBySlug = new Map(allMuscles.map((m) => [m.slug, m]));
  const exerciseByName = new Map(allExercises.map((e) => [e.name, e]));

  for (const [exerciseName, mapping] of Object.entries(exerciseMappings)) {
    const exercise = exerciseByName.get(exerciseName);

    if (!exercise) {
      console.warn(`⚠️ Ejercicio no encontrado: ${exerciseName}`);
      continue;
    }

    const total = mapping.reduce((sum, item) => sum + item.percentage, 0);

    if (total !== 100) {
      throw new Error(
        `El ejercicio "${exerciseName}" no suma 100. Total actual: ${total}`
      );
    }

    await prisma.exerciseMuscle.deleteMany({
      where: { exerciseId: exercise.id },
    });

    for (const item of mapping) {
      const muscle = muscleBySlug.get(item.muscleSlug);

      if (!muscle) {
        throw new Error(
          `No existe el músculo con slug "${item.muscleSlug}" para el ejercicio "${exerciseName}"`
        );
      }

      await prisma.exerciseMuscle.create({
        data: {
          exerciseId: exercise.id,
          muscleId: muscle.id,
          percentage: item.percentage,
        },
      });
    }
  }
}

async function upsertAwardDefinitions() {
  for (const award of awardDefinitions) {
    await prisma.awardDefinition.upsert({
      where: { code: award.code },
      update: {
        name: award.name,
        description: award.description,
        scope: award.scope,
        pointsBonus: award.pointsBonus,
        iconKey: award.iconKey,
        category: award.category,
        level: award.level,
        criteria: award.criteria,
        isActive: true,
      },
      create: {
        code: award.code,
        name: award.name,
        description: award.description,
        scope: award.scope,
        pointsBonus: award.pointsBonus,
        iconKey: award.iconKey,
        category: award.category,
        level: award.level,
        criteria: award.criteria,
        isActive: true,
      },
    });
  }
}

async function main() {
  console.log("🌱 Seeding muscles...");
  await upsertMuscles();

  console.log("🌱 Seeding exercises...");
  await upsertExercises();

  console.log("🌱 Seeding exercise-muscle mappings...");
  await syncExerciseMuscles();

  console.log("🌱 Seeding award definitions...");
  await upsertAwardDefinitions();

  console.log("🌱 Seeding activity types...");
  await upsertActivityTypes();

  console.log("✅ Seed completado");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });