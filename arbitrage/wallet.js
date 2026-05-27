// Global wallet management
class WalletManager {
  constructor() {
    this.privateKey = localStorage.getItem('wallet_pk') || '';
    this.address = '';
    if (this.privateKey) {
      this.updateAddress();
    }
  }

  setPrivateKey(pk) {
    const key = pk.startsWith('0x') ? pk : '0x' + pk;
    try {
      this.address = ethers.computeAddress(key);
      this.privateKey = key;
      localStorage.setItem('wallet_pk', key);
      return true;
    } catch {
      this.privateKey = '';
      this.address = '';
      localStorage.removeItem('wallet_pk');
      return false;
    }
  }

  updateAddress() {
    if (this.privateKey) {
      try {
        this.address = ethers.computeAddress(this.privateKey);
      } catch {
        this.privateKey = '';
        this.address = '';
      }
    }
  }

  getAddress() {
    return this.address;
  }

  getPrivateKey() {
    return this.privateKey;
  }

  isConnected() {
    return !!this.address;
  }

  logout() {
    this.privateKey = '';
    this.address = '';
    localStorage.removeItem('wallet_pk');
  }
}

const wallet = new WalletManager();
