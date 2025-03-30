import { Payee } from '@prisma/client';

// DTO for creating a payee (implicitly done by Transaction Service often)
// We might not need explicit CreatePayeeDto if they are auto-created

// DTO for updating a payee (e.g., renaming)
export interface UpdatePayeeDto {
  name: string;
}

export type PayeeResponse = Payee;
