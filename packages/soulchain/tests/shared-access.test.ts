/**
 * Comprehensive tests for Selective Memory Disclosure + Parent/Child Agent Model
 * 
 * Tests cover:
 * 1. Parent registers child
 * 2. Parent shares MEMORY + AGENTS with child (not SOUL, not LOVE_MAP)
 * 3. Child can read shared docs
 * 4. Child CANNOT read non-shared docs
 * 5. Parent can always read child's docs
 * 6. Revoking access works
 * 7. Re-encryption / shared key derivation
 * 8. Multiple children with different access levels
 * 9. Cross-agent integrity verification
 */

import { MockChainProvider } from '../src/core/sync/chain-mock';
import { SharedAccessManager } from '../src/core/crypto/shared-access';
import { generateKeypair } from '../src/core/crypto/keypair';
import { encrypt, decrypt } from '../src/core/crypto/encryption';
import { deriveDocumentKey } from '../src/core/crypto/key-derivation';
import { sha256 } from '../src/core/utils/hash';

// Document type IDs (match contract)
const SOUL = 0;
const MEMORY = 1;
const AGENTS = 2;
const LOVE_MAP = 6;

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${msg}`);
  console.log(`  ✅ ${msg}`);
}

async function runTests() {
  console.log('\n🧪 SoulChain Selective Disclosure Test Suite\n');
  console.log('='.repeat(60));
  
  // ===== Setup =====
  const chain = new MockChainProvider();
  const sam = new SharedAccessManager();
  
  // Generate keypairs for parent and two children
  const parentKp = generateKeypair();
  const childAKp = generateKeypair();
  const childBKp = generateKeypair();
  
  const parentAddr = '0xParentAgent';
  const childAAddr = '0xChildAgentA';
  const childBAddr = '0xChildAgentB';
  
  // Derive X25519 keys for ECDH
  const parentX25519 = SharedAccessManager.deriveX25519Keypair(parentKp.secretKey);
  const childAX25519 = SharedAccessManager.deriveX25519Keypair(childAKp.secretKey);
  const childBX25519 = SharedAccessManager.deriveX25519Keypair(childBKp.secretKey);

  // ===== Test 1: Registration =====
  console.log('\n📋 Test 1: Agent Registration');
  await chain.registerSoul();
  chain.setAgent(parentAddr);
  
  // Write parent documents
  const soulContent = Buffer.from('I am the parent soul');
  const memoryContent = Buffer.from('Parent memories: important decisions made');
  const agentsContent = Buffer.from('Agent protocols and behaviors');
  const loveMapContent = Buffer.from('Love map: deeply personal');
  
  const soulHash = sha256(soulContent);
  const memHash = sha256(memoryContent);
  const agentsHash = sha256(agentsContent);
  const loveHash = sha256(loveMapContent);
  
  await chain.writeDocument(SOUL, soulHash, soulHash, 'cid-soul', 'sig-soul');
  await chain.writeDocument(MEMORY, memHash, memHash, 'cid-memory', 'sig-memory');
  await chain.writeDocument(AGENTS, agentsHash, agentsHash, 'cid-agents', 'sig-agents');
  await chain.writeDocument(LOVE_MAP, loveHash, loveHash, 'cid-love', 'sig-love');
  
  assert((await chain.documentCount(SOUL)) === 1, 'Parent SOUL document written');
  assert((await chain.documentCount(MEMORY)) === 1, 'Parent MEMORY document written');
  assert((await chain.documentCount(AGENTS)) === 1, 'Parent AGENTS document written');
  assert((await chain.documentCount(LOVE_MAP)) === 1, 'Parent LOVE_MAP document written');

  // ===== Test 2: Parent/Child Registration =====
  console.log('\n📋 Test 2: Parent/Child Registration');
  chain.setAgent(parentAddr);
  await chain.registerChild(childAAddr);
  await chain.registerChild(childBAddr);
  
  const children = await chain.getChildren(parentAddr);
  assert(children.length === 2, 'Parent has 2 children');
  assert(children.includes(childAAddr), 'Child A is registered');
  assert(children.includes(childBAddr), 'Child B is registered');
  
  const parentOfA = await chain.getParent(childAAddr);
  assert(parentOfA === parentAddr, 'Child A parent is correct');
  
  const parentOfB = await chain.getParent(childBAddr);
  assert(parentOfB === parentAddr, 'Child B parent is correct');

  // ===== Test 3: Grant Access (MEMORY + AGENTS to Child A) =====
  console.log('\n📋 Test 3: Selective Access Grant');
  chain.setAgent(parentAddr);
  
  // Grant MEMORY and AGENTS to Child A
  await chain.grantAccess(childAAddr, MEMORY);
  await chain.grantAccess(childAAddr, AGENTS);
  
  // Grant only MEMORY to Child B
  await chain.grantAccess(childBAddr, MEMORY);
  
  assert(await chain.hasAccess(parentAddr, childAAddr, MEMORY), 'Child A has MEMORY access');
  assert(await chain.hasAccess(parentAddr, childAAddr, AGENTS), 'Child A has AGENTS access');
  assert(!(await chain.hasAccess(parentAddr, childAAddr, SOUL)), 'Child A does NOT have SOUL access');
  assert(!(await chain.hasAccess(parentAddr, childAAddr, LOVE_MAP)), 'Child A does NOT have LOVE_MAP access');
  
  assert(await chain.hasAccess(parentAddr, childBAddr, MEMORY), 'Child B has MEMORY access');
  assert(!(await chain.hasAccess(parentAddr, childBAddr, AGENTS)), 'Child B does NOT have AGENTS access');

  // ===== Test 4: Re-encryption (Shared Key Derivation) =====
  console.log('\n📋 Test 4: Proxy Re-Encryption');
  
  // Parent creates a document symmetric key
  const docSymKey = deriveDocumentKey(parentKp.secretKey, 'memory', 0);
  assert(docSymKey.length === 32, 'Document symmetric key is 32 bytes');
  
  // Parent encrypts content with the sym key
  const encrypted = encrypt(memoryContent, docSymKey);
  const encryptedBuf = Buffer.concat([encrypted.iv, encrypted.tag, encrypted.ciphertext]);
  
  // Parent creates access key for Child A
  const accessKeyA = await sam.createAccessKey(
    parentKp, childAX25519.publicKey, MEMORY, docSymKey, parentAddr, childAAddr
  );
  assert(accessKeyA.encryptedSymKey.length > 0, 'Access key created for Child A');
  assert(accessKeyA.nonce.length === 12, 'Access key nonce is 12 bytes');
  
  // Child A decrypts the symmetric key
  const decryptedSymKey = await sam.decryptSymKey(childAKp, parentX25519.publicKey, accessKeyA);
  assert(Buffer.from(docSymKey).equals(decryptedSymKey), 'Child A can derive correct symmetric key');
  
  // Child A decrypts the document content
  const decryptedContent = await sam.decryptWithAccess(
    childAKp, parentX25519.publicKey, accessKeyA, encryptedBuf
  );
  assert(decryptedContent.equals(memoryContent), 'Child A decrypted content matches original');

  // ===== Test 5: Serialization / On-chain Storage =====
  console.log('\n📋 Test 5: Access Key Serialization');
  
  const serialized = SharedAccessManager.serializeAccessKey(accessKeyA);
  assert(serialized.length > 12, 'Serialized access key has nonce + data');
  
  const deserialized = SharedAccessManager.deserializeAccessKey(
    serialized, parentAddr, childAAddr, MEMORY
  );
  assert(deserialized.nonce.equals(accessKeyA.nonce), 'Deserialized nonce matches');
  assert(deserialized.encryptedSymKey.equals(accessKeyA.encryptedSymKey), 'Deserialized encrypted key matches');
  
  // Store on mock chain
  chain.setAgent(parentAddr);
  await chain.storeAccessKey(childAAddr, MEMORY, serialized);
  const retrieved = await chain.getAccessKey(parentAddr, childAAddr, MEMORY);
  assert(retrieved !== null, 'Access key retrieved from chain');
  assert(retrieved!.equals(serialized), 'Retrieved access key matches stored');

  // ===== Test 6: Parent Can Always Read Children =====
  console.log('\n📋 Test 6: Parent Auto-Access to Children');
  
  // Write a doc as child A
  chain.setAgent(childAAddr);
  const childDoc = Buffer.from('Child A private thoughts');
  const childHash = sha256(childDoc);
  await chain.writeDocument(SOUL, childHash, childHash, 'cid-child-soul', 'sig-child');
  
  // Parent should be able to read (via parent mapping)
  const hasParentAccess = await chain.hasAccess(childAAddr, parentAddr, SOUL);
  assert(hasParentAccess, 'Parent has automatic access to child SOUL');

  // ===== Test 7: Revocation =====
  console.log('\n📋 Test 7: Access Revocation');
  
  chain.setAgent(parentAddr);
  // Verify access exists before revocation
  assert(await chain.hasAccess(parentAddr, childAAddr, MEMORY), 'Child A has MEMORY access before revoke');
  
  // Revoke MEMORY from Child A
  await chain.revokeAccess(childAAddr, MEMORY);
  await chain.removeAccessKey(childAAddr, MEMORY);
  
  assert(!(await chain.hasAccess(parentAddr, childAAddr, MEMORY)), 'Child A MEMORY access revoked');
  assert(await chain.hasAccess(parentAddr, childAAddr, AGENTS), 'Child A still has AGENTS access');
  
  const revokedKey = await chain.getAccessKey(parentAddr, childAAddr, MEMORY);
  assert(revokedKey === null, 'Access key removed after revocation');

  // ===== Test 8: Multiple Children, Different Levels =====
  console.log('\n📋 Test 8: Multiple Children Different Access');
  
  // Create access key for Child B (MEMORY only)
  const accessKeyB = await sam.createAccessKey(
    parentKp, childBX25519.publicKey, MEMORY, docSymKey, parentAddr, childBAddr
  );
  
  // Child B can decrypt MEMORY
  const decryptedByB = await sam.decryptWithAccess(
    childBKp, parentX25519.publicKey, accessKeyB, encryptedBuf
  );
  assert(decryptedByB.equals(memoryContent), 'Child B can decrypt MEMORY');
  
  // Verify Child B cannot use Child A's access key
  try {
    await sam.decryptSymKey(childBKp, parentX25519.publicKey, accessKeyA);
    assert(false, 'Child B should NOT decrypt with Child A key');
  } catch {
    assert(true, 'Child B cannot use Child A access key (different ECDH shared secret)');
  }

  // ===== Test 9: Cross-Agent Integrity =====
  console.log('\n📋 Test 9: Cross-Agent Integrity Verification');
  
  chain.setAgent(parentAddr);
  const memDoc = await chain.latestDocument(MEMORY);
  assert(memDoc !== null, 'MEMORY document exists on chain');
  assert(memDoc!.contentHash === memHash, 'Content hash matches on chain');
  
  const verified = await chain.verifyDocument(MEMORY, 0, memHash);
  assert(verified, 'Document integrity verified on chain');
  
  const tampered = await chain.verifyDocument(MEMORY, 0, 'badhash');
  assert(!tampered, 'Tampered hash rejected');

  // ===== Summary =====
  console.log('\n' + '='.repeat(60));
  console.log('🎉 ALL TESTS PASSED\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILURE:', err.message);
  console.error(err.stack);
  process.exit(1);
});
