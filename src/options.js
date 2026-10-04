/**
 * ContextClip - Options Page Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const chkMetadata = document.getElementById('chkMetadata');
  const chkLinks = document.getElementById('chkLinks');
  const chkTables = document.getElementById('chkTables');
  const chkImages = document.getElementById('chkImages');
  const selDefaultPrompt = document.getElementById('selDefaultPrompt');

  const txtGithubSponsor = document.getElementById('txtGithubSponsor');
  const txtBmac = document.getElementById('txtBmac');
  const txtCustomSponsor = document.getElementById('txtCustomSponsor');

  const btnSave = document.getElementById('btnSave');
  const saveStatus = document.getElementById('saveStatus');

  // Load existing options
  chrome.storage.sync.get(ContextClipSettings.defaults, (items) => {
    chkMetadata.checked = items.includeMetadata;
    chkLinks.checked = items.includeLinks;
    chkTables.checked = items.enableTables;
    chkImages.checked = items.includeImages;
    selDefaultPrompt.value = items.defaultPrompt;

    txtGithubSponsor.value = ContextClipSettings.sponsorUrl(items.githubSponsorUrl);
    txtBmac.value = ContextClipSettings.sponsorUrl(items.bmacUrl);
    txtCustomSponsor.value = ContextClipSettings.sponsorUrl(items.customSponsorUrl);
  });

  // Save options
  btnSave.addEventListener('click', () => {
    for (const field of [txtGithubSponsor, txtBmac, txtCustomSponsor]) {
      if (field.value.trim() && !ContextClipSettings.sponsorUrl(field.value.trim())) {
        saveStatus.textContent = 'Enter a valid HTTPS creator page, or leave the link blank.';
        field.focus();
        return;
      }
    }
    const settings = {
      includeMetadata: chkMetadata.checked,
      includeLinks: chkLinks.checked,
      enableTables: chkTables.checked,
      includeImages: chkImages.checked,
      defaultPrompt: selDefaultPrompt.value,
      githubSponsorUrl: txtGithubSponsor.value.trim(),
      bmacUrl: txtBmac.value.trim(),
      customSponsorUrl: txtCustomSponsor.value.trim()
    };

    chrome.storage.sync.set(settings, () => {
      if (chrome.runtime.lastError) {
        saveStatus.textContent = 'Could not save settings: ' + chrome.runtime.lastError.message;
        return;
      }
      saveStatus.textContent = '✓ Preferences saved successfully!';
      setTimeout(() => {
        saveStatus.textContent = '';
      }, 2500);
    });
  });
});
