-- CreateTable
CREATE TABLE "Context" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,

    CONSTRAINT "Context_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ContextToTodo" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Context_name_key" ON "Context"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_ContextToTodo_AB_unique" ON "_ContextToTodo"("A", "B");

-- CreateIndex
CREATE INDEX "_ContextToTodo_B_index" ON "_ContextToTodo"("B");

-- AddForeignKey
ALTER TABLE "_ContextToTodo" ADD CONSTRAINT "_ContextToTodo_A_fkey" FOREIGN KEY ("A") REFERENCES "Context"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContextToTodo" ADD CONSTRAINT "_ContextToTodo_B_fkey" FOREIGN KEY ("B") REFERENCES "Todo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
