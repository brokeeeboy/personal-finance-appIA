-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Category_userId_idx" ON "Category"("userId");

-- CreateIndex
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");

-- CreateIndex
CREATE INDEX "Transaction_accountId_idx" ON "Transaction"("accountId");

-- CreateIndex
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");

-- CreateIndex
CREATE INDEX "CategoryRule_userId_idx" ON "CategoryRule"("userId");

-- CreateIndex
CREATE INDEX "CategoryRule_categoryId_idx" ON "CategoryRule"("categoryId");

-- CreateIndex
CREATE INDEX "Debt_userId_status_idx" ON "Debt"("userId", "status");

-- CreateIndex
CREATE INDEX "Debt_userId_dueDate_idx" ON "Debt"("userId", "dueDate");

-- CreateIndex
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");

-- CreateIndex
CREATE INDEX "GoalContribution_goalId_idx" ON "GoalContribution"("goalId");
