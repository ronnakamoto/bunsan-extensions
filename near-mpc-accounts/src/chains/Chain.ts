export interface Chain {
  generateAddress(
    publicKey: string,
    accountId: string,
    path: string,
  ): Promise<string>;
  validateAddress(address: string): boolean;
}
