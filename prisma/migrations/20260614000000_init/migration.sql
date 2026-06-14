-- CreateTable
CREATE TABLE "Aluno" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Aluno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Local" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "bairro" TEXT NOT NULL,
    "distanciaKm" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "tempoMinutos" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Local_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AulaSemanal" (
    "id" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "diaDaSemana" INTEGER NOT NULL,
    "horarioInicio" TEXT NOT NULL,
    "horarioFim" TEXT NOT NULL,
    "valorAula" DOUBLE PRECISION NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AulaSemanal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuracao" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Configuracao_pkey" PRIMARY KEY ("key")
);

-- AddForeignKey
ALTER TABLE "AulaSemanal" ADD CONSTRAINT "AulaSemanal_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AulaSemanal" ADD CONSTRAINT "AulaSemanal_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE CASCADE ON UPDATE CASCADE;
