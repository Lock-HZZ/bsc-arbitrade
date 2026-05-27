// Global wallet connection modal
function createWalletModal() {
  const modal = document.createElement('div');
  modal.id = 'walletModal';
  modal.style.cssText = `
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.8);
    z-index: 9999;
    align-items: center;
    justify-content: center;
  `;
  modal.innerHTML = `
    <div style="background: #0d1120; border: 1px solid #1a2040; border-radius: 10px; padding: 30px; max-width: 400px; width: 90%;">
      <h2 style="color: #00f5c4; margin-bottom: 20px; font-size: 16px;">连接钱包</h2>
      <input id="modalPk" type="password" placeholder="输入私钥 0x..." autocomplete="off" style="background: #0a0e1c; border: 1px solid #1a2040; color: #c8d6f0; padding: 12px; border-radius: 6px; font-family: inherit; font-size: 13px; width: 100%; margin-bottom: 15px; box-sizing: border-box;" />
      <div style="display: flex; gap: 10px;">
        <button onclick="connectWallet()" style="flex: 1; padding: 12px; background: linear-gradient(135deg, #00f5c4, #7c6fff); border: none; border-radius: 6px; color: #080b14; cursor: pointer; font-weight: bold; font-family: inherit;">连接</button>
        <button onclick="closeWalletModal()" style="flex: 1; padding: 12px; background: transparent; border: 1px solid #1a2040; border-radius: 6px; color: #4a5580; cursor: pointer; font-family: inherit;">取消</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// Create wallet button
function createWalletButton() {
  const btn = document.createElement('button');
  btn.id = 'walletConnectBtn';
  btn.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 10px 16px;
    background: linear-gradient(135deg, #00f5c4, #7c6fff);
    border: none;
    border-radius: 6px;
    color: #080b14;
    cursor: pointer;
    font-weight: bold;
    font-family: inherit;
    z-index: 9998;
    font-size: 13px;
  `;
  btn.onclick = toggleWallet;
  document.body.appendChild(btn);
  updateWalletButton();
}

function updateWalletButton() {
  const btn = document.getElementById('walletConnectBtn');
  if (!btn) return;
  if (wallet.isConnected()) {
    btn.textContent = '🔓 ' + wallet.getAddress().slice(0,6) + '...';
    btn.style.background = 'rgba(255, 69, 96, 0.3)';
    btn.style.borderColor = 'rgba(255, 69, 96, 0.5)';
    btn.style.color = '#ff4560';
  } else {
    btn.textContent = '🔐 连接钱包';
    btn.style.background = 'linear-gradient(135deg, #00f5c4, #7c6fff)';
    btn.style.color = '#080b14';
  }
}

function toggleWallet() {
  if (wallet.isConnected()) {
    wallet.logout();
    updateWalletButton();
  } else {
    openWalletModal();
  }
}

function openWalletModal() {
  const modal = document.getElementById('walletModal') || createWalletModal();
  modal.style.display = 'flex';
  document.getElementById('modalPk').focus();
}

function closeWalletModal() {
  const modal = document.getElementById('walletModal');
  if (modal) {
    modal.style.display = 'none';
    document.getElementById('modalPk').value = '';
  }
}

function connectWallet() {
  const pk = document.getElementById('modalPk').value.trim();
  if (!pk) {
    alert('请输入私钥');
    return;
  }
  if (wallet.setPrivateKey(pk)) {
    closeWalletModal();
    updateWalletButton();
    location.href = 'index.html';
  } else {
    alert('私钥格式无效');
  }
}

function disconnectWallet() {
  wallet.logout();
  updateWalletStatus();
}

function requireWallet(callback) {
  if (wallet.isConnected()) {
    callback();
  } else {
    openWalletModal();
  }
}

// Initialize immediately
if (document.body) {
  createWalletModal();
  createWalletButton();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    createWalletModal();
    createWalletButton();
  });
}
