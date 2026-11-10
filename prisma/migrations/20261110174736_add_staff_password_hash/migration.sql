-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordHash" VARCHAR(255);

-- AddCheckConstraint (escrito à mão, mesmo raciocínio do CHECK de
-- User_role_clientId_check na migração inicial): CLIENT nunca tem senha —
-- login de cliente continua só por link mágico. STAFF pode ou não ter senha
-- definida (a conta nasce sem, até alguém rodar `create-staff --password`),
-- por isso não exigimos o inverso (STAFF NOT NULL).
ALTER TABLE "User" ADD CONSTRAINT "User_password_role_check" CHECK (
  "role" = 'STAFF' OR "passwordHash" IS NULL
);
