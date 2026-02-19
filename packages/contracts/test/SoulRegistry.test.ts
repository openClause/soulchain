import { expect } from "chai";
import { ethers } from "hardhat";
import { SoulRegistry } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("SoulRegistry", function () {
  let registry: SoulRegistry;
  let owner: HardhatEthersSigner;
  let reader: HardhatEthersSigner;
  let stranger: HardhatEthersSigner;

  const SOUL = 0;
  const MEMORY = 1;

  const contentHash = ethers.keccak256(ethers.toUtf8Bytes("hello world"));
  const encryptedHash = ethers.keccak256(ethers.toUtf8Bytes("encrypted"));
  const storageCid = "QmTest123";
  const signature = "0xdeadbeef";

  const contentHash2 = ethers.keccak256(ethers.toUtf8Bytes("hello world v2"));
  const encryptedHash2 = ethers.keccak256(ethers.toUtf8Bytes("encrypted v2"));
  const storageCid2 = "QmTest456";

  beforeEach(async function () {
    [owner, reader, stranger] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SoulRegistry");
    registry = await Factory.deploy();
    await registry.waitForDeployment();
  });

  it("should register a soul", async function () {
    const tx = await registry.connect(owner).registerSoul();
    const receipt = await tx.wait();
    expect(await registry.registered(owner.address)).to.be.true;
    // Check event
    await expect(tx).to.emit(registry, "SoulRegistered").withArgs(owner.address, (v: any) => v > 0);
  });

  it("should not register twice", async function () {
    await registry.connect(owner).registerSoul();
    await expect(registry.connect(owner).registerSoul()).to.be.revertedWith("Already registered");
  });

  it("should write document with version 0 and prevHash 0x0", async function () {
    await registry.connect(owner).registerSoul();
    await registry.connect(owner).writeDocument(SOUL, contentHash, encryptedHash, storageCid, signature);

    const doc = await registry.connect(owner).latestDocument(owner.address, SOUL);
    expect(doc.contentHash).to.equal(contentHash);
    expect(doc.encryptedHash).to.equal(encryptedHash);
    expect(doc.storageCid).to.equal(storageCid);
    expect(doc.version).to.equal(0);
    expect(doc.prevHash).to.equal(ethers.ZeroHash);
  });

  it("should write second version with prevHash linking", async function () {
    await registry.connect(owner).registerSoul();
    await registry.connect(owner).writeDocument(SOUL, contentHash, encryptedHash, storageCid, signature);
    await registry.connect(owner).writeDocument(SOUL, contentHash2, encryptedHash2, storageCid2, signature);

    const doc = await registry.connect(owner).latestDocument(owner.address, SOUL);
    expect(doc.version).to.equal(1);
    expect(doc.prevHash).to.equal(contentHash);
  });

  it("should read latest document", async function () {
    await registry.connect(owner).registerSoul();
    await registry.connect(owner).writeDocument(SOUL, contentHash, encryptedHash, storageCid, signature);
    await registry.connect(owner).writeDocument(SOUL, contentHash2, encryptedHash2, storageCid2, signature);

    const doc = await registry.connect(owner).latestDocument(owner.address, SOUL);
    expect(doc.storageCid).to.equal(storageCid2);
  });

  it("should read specific version", async function () {
    await registry.connect(owner).registerSoul();
    await registry.connect(owner).writeDocument(SOUL, contentHash, encryptedHash, storageCid, signature);
    await registry.connect(owner).writeDocument(SOUL, contentHash2, encryptedHash2, storageCid2, signature);

    const doc = await registry.connect(owner).documentAt(owner.address, SOUL, 0);
    expect(doc.storageCid).to.equal(storageCid);
  });

  it("should verify document hash correctly", async function () {
    await registry.connect(owner).registerSoul();
    await registry.connect(owner).writeDocument(SOUL, contentHash, encryptedHash, storageCid, signature);

    expect(await registry.verifyDocument(owner.address, SOUL, 0, contentHash)).to.be.true;
    expect(await registry.verifyDocument(owner.address, SOUL, 0, contentHash2)).to.be.false;
    // Non-existent version
    expect(await registry.verifyDocument(owner.address, SOUL, 99, contentHash)).to.be.false;
  });

  it("should not allow unregistered to write", async function () {
    await expect(
      registry.connect(owner).writeDocument(SOUL, contentHash, encryptedHash, storageCid, signature)
    ).to.be.revertedWith("Not registered");
  });

  it("should deny read access to non-owner without grant", async function () {
    await registry.connect(owner).registerSoul();
    await registry.connect(owner).writeDocument(SOUL, contentHash, encryptedHash, storageCid, signature);

    await expect(
      registry.connect(stranger).latestDocument(owner.address, SOUL)
    ).to.be.revertedWith("Access denied");

    await expect(
      registry.connect(stranger).documentAt(owner.address, SOUL, 0)
    ).to.be.revertedWith("Access denied");
  });

  it("should allow read after granting access", async function () {
    await registry.connect(owner).registerSoul();
    await registry.connect(owner).writeDocument(SOUL, contentHash, encryptedHash, storageCid, signature);
    await registry.connect(owner).grantAccess(reader.address, SOUL);

    expect(await registry.hasAccess(owner.address, reader.address, SOUL)).to.be.true;

    const doc = await registry.connect(reader).latestDocument(owner.address, SOUL);
    expect(doc.contentHash).to.equal(contentHash);
  });

  it("should deny read after revoking access", async function () {
    await registry.connect(owner).registerSoul();
    await registry.connect(owner).writeDocument(SOUL, contentHash, encryptedHash, storageCid, signature);
    await registry.connect(owner).grantAccess(reader.address, SOUL);
    await registry.connect(owner).revokeAccess(reader.address, SOUL);

    expect(await registry.hasAccess(owner.address, reader.address, SOUL)).to.be.false;

    await expect(
      registry.connect(reader).latestDocument(owner.address, SOUL)
    ).to.be.revertedWith("Access denied");
  });

  it("should return correct document count", async function () {
    await registry.connect(owner).registerSoul();
    expect(await registry.documentCount(owner.address, SOUL)).to.equal(0);

    await registry.connect(owner).writeDocument(SOUL, contentHash, encryptedHash, storageCid, signature);
    expect(await registry.documentCount(owner.address, SOUL)).to.equal(1);

    await registry.connect(owner).writeDocument(SOUL, contentHash2, encryptedHash2, storageCid2, signature);
    expect(await registry.documentCount(owner.address, SOUL)).to.equal(2);
  });

  it("should emit DocumentWritten event", async function () {
    await registry.connect(owner).registerSoul();
    const tx = registry.connect(owner).writeDocument(SOUL, contentHash, encryptedHash, storageCid, signature);
    await expect(tx)
      .to.emit(registry, "DocumentWritten")
      .withArgs(owner.address, SOUL, 0, contentHash, storageCid);
  });
});
