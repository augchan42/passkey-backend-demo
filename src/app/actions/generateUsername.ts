"use server";

import { firstname, lastname } from "@/constants/names"; // Adjust path as needed

export type GenerateUsernameResult = {
  name: string;
};

export async function generateUsername(): Promise<GenerateUsernameResult> {
  const randomFirstName =
    firstname[Math.floor(Math.random() * firstname.length)];
  const randomLastName = lastname[Math.floor(Math.random() * lastname.length)];
  const randomNumber = Math.floor(10000 + Math.random() * 90000); // 5-digit number
  const formattedName =
    `${randomFirstName}-${randomLastName}-${randomNumber}`.toLowerCase();
  return { name: formattedName };
}
