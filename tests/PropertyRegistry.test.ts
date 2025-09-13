import { describe, it, expect, beforeEach } from "vitest";
import { stringUtf8CV, uintCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_PROPERTY_EXISTS = 101;
const ERR_INVALID_HASH = 102;
const ERR_INVALID_DESCRIPTION = 104;
const ERR_INVALID_ADDRESS = 105;
const ERR_AUTHORITY_NOT_VERIFIED = 107;
const ERR_INVALID_OWNER = 108;
const ERR_PROPERTY_NOT_FOUND = 109;
const ERR_INVALID_UPDATE_PARAM = 110;
const ERR_MAX_PROPERTIES_EXCEEDED = 111;
const ERR_INVALID_LOCATION = 113;
const ERR_INVALID_CURRENCY = 114;
const ERR_INVALID_SIZE = 115;
const ERR_INVALID_ZONING = 116;
const ERR_INVALID_TAX_ID = 117;
const ERR_INVALID_ASSESSMENT = 118;
const ERR_INVALID_LIEN = 119;
const ERR_INVALID_MORTGAGE = 120;

interface Property {
  owner: string;
  legalDescription: string;
  documentHash: Uint8Array;
  address: string;
  registeredAt: number;
  location: string;
  currency: string;
  status: boolean;
  sizeSqft: number;
  zoningType: string;
  taxId: string;
  assessmentValue: number;
  hasLien: boolean;
  lienAmount: number;
  hasMortgage: boolean;
  mortgageAmount: number;
}

interface PropertyUpdate {
  updateDescription: string;
  updateAddress: string;
  updateTimestamp: number;
  updater: string;
  updateSizeSqft: number;
  updateZoningType: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class PropertyRegistryMock {
  state: {
    nextPropertyId: number;
    maxProperties: number;
    registrationFee: number;
    authorityContract: string | null;
    properties: Map<number, Property>;
    propertyUpdates: Map<number, PropertyUpdate>;
    propertiesByHash: Map<string, number>;
  } = {
    nextPropertyId: 0,
    maxProperties: 10000,
    registrationFee: 5000,
    authorityContract: null,
    properties: new Map(),
    propertyUpdates: new Map(),
    propertiesByHash: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextPropertyId: 0,
      maxProperties: 10000,
      registrationFee: 5000,
      authorityContract: null,
      properties: new Map(),
      propertyUpdates: new Map(),
      propertiesByHash: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.stxTransfers = [];
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") {
      return { ok: false, value: false };
    }
    if (this.state.authorityContract !== null) {
      return { ok: false, value: false };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setRegistrationFee(newFee: number): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: false };
    this.state.registrationFee = newFee;
    return { ok: true, value: true };
  }

  registerProperty(
    legalDescription: string,
    documentHash: Uint8Array,
    address: string,
    location: string,
    currency: string,
    sizeSqft: number,
    zoningType: string,
    taxId: string,
    assessmentValue: number,
    lienAmount: number,
    mortgageAmount: number
  ): Result<number> {
    if (this.state.nextPropertyId >= this.state.maxProperties) return { ok: false, value: ERR_MAX_PROPERTIES_EXCEEDED };
    if (!legalDescription || legalDescription.length > 512) return { ok: false, value: ERR_INVALID_DESCRIPTION };
    if (documentHash.length !== 32) return { ok: false, value: ERR_INVALID_HASH };
    if (!address || address.length > 256) return { ok: false, value: ERR_INVALID_ADDRESS };
    if (!location || location.length > 128) return { ok: false, value: ERR_INVALID_LOCATION };
    if (!["STX", "USD", "BTC"].includes(currency)) return { ok: false, value: ERR_INVALID_CURRENCY };
    if (sizeSqft <= 0) return { ok: false, value: ERR_INVALID_SIZE };
    if (!["residential", "commercial", "industrial"].includes(zoningType)) return { ok: false, value: ERR_INVALID_ZONING };
    if (!taxId || taxId.length > 100) return { ok: false, value: ERR_INVALID_TAX_ID };
    if (assessmentValue <= 0) return { ok: false, value: ERR_INVALID_ASSESSMENT };
    if (lienAmount < 0) return { ok: false, value: ERR_INVALID_LIEN };
    if (mortgageAmount < 0) return { ok: false, value: ERR_INVALID_MORTGAGE };
    const hashKey = Buffer.from(documentHash).toString('hex');
    if (this.state.propertiesByHash.has(hashKey)) return { ok: false, value: ERR_PROPERTY_EXISTS };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };

    this.stxTransfers.push({ amount: this.state.registrationFee, from: this.caller, to: this.state.authorityContract });

    const id = this.state.nextPropertyId;
    const property: Property = {
      owner: this.caller,
      legalDescription,
      documentHash,
      address,
      registeredAt: this.blockHeight,
      location,
      currency,
      status: true,
      sizeSqft,
      zoningType,
      taxId,
      assessmentValue,
      hasLien: lienAmount > 0,
      lienAmount,
      hasMortgage: mortgageAmount > 0,
      mortgageAmount,
    };
    this.state.properties.set(id, property);
    this.state.propertiesByHash.set(hashKey, id);
    this.state.nextPropertyId++;
    return { ok: true, value: id };
  }

  getProperty(id: number): Property | null {
    return this.state.properties.get(id) || null;
  }

  updateProperty(id: number, updateDescription: string, updateAddress: string, updateSizeSqft: number, updateZoningType: string): Result<boolean> {
    const property = this.state.properties.get(id);
    if (!property) return { ok: false, value: false };
    if (property.owner !== this.caller) return { ok: false, value: false };
    if (!updateDescription || updateDescription.length > 512) return { ok: false, value: false };
    if (!updateAddress || updateAddress.length > 256) return { ok: false, value: false };
    if (updateSizeSqft <= 0) return { ok: false, value: false };
    if (!["residential", "commercial", "industrial"].includes(updateZoningType)) return { ok: false, value: false };

    const updated: Property = {
      ...property,
      legalDescription: updateDescription,
      address: updateAddress,
      sizeSqft: updateSizeSqft,
      zoningType: updateZoningType,
      registeredAt: this.blockHeight,
    };
    this.state.properties.set(id, updated);
    this.state.propertyUpdates.set(id, {
      updateDescription,
      updateAddress,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
      updateSizeSqft,
      updateZoningType,
    });
    return { ok: true, value: true };
  }

  getPropertyCount(): Result<number> {
    return { ok: true, value: this.state.nextPropertyId };
  }

  checkPropertyExistence(hash: Uint8Array): Result<boolean> {
    const hashKey = Buffer.from(hash).toString('hex');
    return { ok: true, value: this.state.propertiesByHash.has(hashKey) };
  }
}

describe("PropertyRegistry", () => {
  let contract: PropertyRegistryMock;

  beforeEach(() => {
    contract = new PropertyRegistryMock();
    contract.reset();
  });

  it("registers a property successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    const result = contract.registerProperty(
      "Legal Desc",
      hash,
      "123 Main St",
      "City",
      "STX",
      2000,
      "residential",
      "TAX123",
      100000,
      0,
      50000
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const property = contract.getProperty(0);
    expect(property?.legalDescription).toBe("Legal Desc");
    expect(property?.address).toBe("123 Main St");
    expect(property?.sizeSqft).toBe(2000);
    expect(property?.zoningType).toBe("residential");
    expect(property?.hasMortgage).toBe(true);
    expect(contract.stxTransfers).toEqual([{ amount: 5000, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects duplicate property hashes", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    contract.registerProperty(
      "Legal Desc",
      hash,
      "123 Main St",
      "City",
      "STX",
      2000,
      "residential",
      "TAX123",
      100000,
      0,
      50000
    );
    const result = contract.registerProperty(
      "Another Desc",
      hash,
      "456 Elm St",
      "Town",
      "USD",
      3000,
      "commercial",
      "TAX456",
      200000,
      10000,
      0
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_PROPERTY_EXISTS);
  });

  it("rejects registration without authority contract", () => {
    const hash = new Uint8Array(32).fill(1);
    const result = contract.registerProperty(
      "NoAuth",
      hash,
      "123 Main St",
      "City",
      "STX",
      2000,
      "residential",
      "TAX123",
      100000,
      0,
      50000
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_VERIFIED);
  });

  it("rejects invalid description", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    const longDesc = "a".repeat(513);
    const result = contract.registerProperty(
      longDesc,
      hash,
      "123 Main St",
      "City",
      "STX",
      2000,
      "residential",
      "TAX123",
      100000,
      0,
      50000
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_DESCRIPTION);
  });

  it("rejects invalid hash", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(31).fill(1);
    const result = contract.registerProperty(
      "Legal Desc",
      hash,
      "123 Main St",
      "City",
      "STX",
      2000,
      "residential",
      "TAX123",
      100000,
      0,
      50000
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_HASH);
  });

  it("updates a property successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    contract.registerProperty(
      "Old Desc",
      hash,
      "Old Address",
      "City",
      "STX",
      2000,
      "residential",
      "TAX123",
      100000,
      0,
      50000
    );
    const result = contract.updateProperty(0, "New Desc", "New Address", 2500, "commercial");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const property = contract.getProperty(0);
    expect(property?.legalDescription).toBe("New Desc");
    expect(property?.address).toBe("New Address");
    expect(property?.sizeSqft).toBe(2500);
    expect(property?.zoningType).toBe("commercial");
    const update = contract.state.propertyUpdates.get(0);
    expect(update?.updateDescription).toBe("New Desc");
    expect(update?.updateAddress).toBe("New Address");
    expect(update?.updateSizeSqft).toBe(2500);
    expect(update?.updateZoningType).toBe("commercial");
  });

  it("rejects update for non-existent property", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.updateProperty(99, "New Desc", "New Address", 2500, "commercial");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects update by non-owner", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    contract.registerProperty(
      "Legal Desc",
      hash,
      "123 Main St",
      "City",
      "STX",
      2000,
      "residential",
      "TAX123",
      100000,
      0,
      50000
    );
    contract.caller = "ST3FAKE";
    const result = contract.updateProperty(0, "New Desc", "New Address", 2500, "commercial");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("sets registration fee successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setRegistrationFee(10000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.registrationFee).toBe(10000);
    const hash = new Uint8Array(32).fill(1);
    contract.registerProperty(
      "Legal Desc",
      hash,
      "123 Main St",
      "City",
      "STX",
      2000,
      "residential",
      "TAX123",
      100000,
      0,
      50000
    );
    expect(contract.stxTransfers).toEqual([{ amount: 10000, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects registration fee change without authority contract", () => {
    const result = contract.setRegistrationFee(10000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("returns correct property count", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash1 = new Uint8Array(32).fill(1);
    const hash2 = new Uint8Array(32).fill(2);
    contract.registerProperty(
      "Desc1",
      hash1,
      "Addr1",
      "City1",
      "STX",
      2000,
      "residential",
      "TAX1",
      100000,
      0,
      50000
    );
    contract.registerProperty(
      "Desc2",
      hash2,
      "Addr2",
      "City2",
      "USD",
      3000,
      "commercial",
      "TAX2",
      200000,
      10000,
      0
    );
    const result = contract.getPropertyCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("checks property existence correctly", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    contract.registerProperty(
      "Legal Desc",
      hash,
      "123 Main St",
      "City",
      "STX",
      2000,
      "residential",
      "TAX123",
      100000,
      0,
      50000
    );
    const result = contract.checkPropertyExistence(hash);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const fakeHash = new Uint8Array(32).fill(3);
    const result2 = contract.checkPropertyExistence(fakeHash);
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });

  it("parses property parameters with Clarity types", () => {
    const desc = stringUtf8CV("Legal Desc");
    const size = uintCV(2000);
    expect(desc.value).toBe("Legal Desc");
    expect(size.value).toEqual(BigInt(2000));
  });

  it("rejects property registration with empty description", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(1);
    const result = contract.registerProperty(
      "",
      hash,
      "123 Main St",
      "City",
      "STX",
      2000,
      "residential",
      "TAX123",
      100000,
      0,
      50000
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_DESCRIPTION);
  });

  it("rejects property registration with max properties exceeded", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.state.maxProperties = 1;
    const hash1 = new Uint8Array(32).fill(1);
    contract.registerProperty(
      "Desc1",
      hash1,
      "Addr1",
      "City1",
      "STX",
      2000,
      "residential",
      "TAX1",
      100000,
      0,
      50000
    );
    const hash2 = new Uint8Array(32).fill(2);
    const result = contract.registerProperty(
      "Desc2",
      hash2,
      "Addr2",
      "City2",
      "USD",
      3000,
      "commercial",
      "TAX2",
      200000,
      10000,
      0
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_PROPERTIES_EXCEEDED);
  });

  it("sets authority contract successfully", () => {
    const result = contract.setAuthorityContract("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.authorityContract).toBe("ST2TEST");
  });

  it("rejects invalid authority contract", () => {
    const result = contract.setAuthorityContract("SP000000000000000000002Q6VF78");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });
});