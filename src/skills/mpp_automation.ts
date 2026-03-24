export async function fundSessionFromDiscovery(
  identitySkill: any,
  mppSkill: any,
  agentAddress: string,
  tokenIdentifier: string = "EGLD",
  durationSeconds: number = 3600
): Promise<string> {
  // 1. Fetch pricing directly from the identity/registry
  const priceInt = await identitySkill.getAgentPricing(agentAddress);

  // 2. Open an MPP session funded with that exact price
  const txHash = await mppSkill.openSession(agentAddress, priceInt, tokenIdentifier, durationSeconds);
  
  return txHash;
}

export async function slashSessionOnFeedback(
  identitySkill: any,
  mppSkill: any,
  agentAddress: string,
  rating: number,
  jobId: string,
  channelId: string
): Promise<{ feedbackTx: string; closeTx?: string }> {
  // 1. Submit the feedback on-chain via identity registry
  const feedbackTx = await identitySkill.submitFeedback(agentAddress, rating, jobId);

  // 2. If it's a negative rating (e.g., < 3 stars), immediately request session close
  let closeTx: string | undefined = undefined;
  if (rating < 3) {
    closeTx = await mppSkill.requestCloseSession(channelId);
  }

  return { feedbackTx, closeTx };
}
