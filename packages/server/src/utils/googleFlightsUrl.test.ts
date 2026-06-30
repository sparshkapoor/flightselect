import { describe, it, expect } from 'vitest';
import { buildGoogleFlightsMultiCityTfsUrl, buildGoogleFlightsRoundTripTfsUrl, type FlightSegment } from './googleFlightsUrl';

// Minimal inline protobuf decoder (inverse of the encoders in googleFlightsUrl.ts) —
// just enough to assert on field numbers/values, not a general-purpose parser.
function readVarint(buf: Buffer, offset: number): [bigint, number] {
  let result = 0n, shift = 0n, b: number;
  do {
    b = buf[offset++];
    result |= BigInt(b & 0x7f) << shift;
    shift += 7n;
  } while (b & 0x80);
  return [result, offset];
}

interface DecodedField {
  field: number;
  wireType: number;
  value: bigint | Buffer;
}

function decode(buf: Buffer): DecodedField[] {
  const out: DecodedField[] = [];
  let offset = 0;
  while (offset < buf.length) {
    const [tag, o1] = readVarint(buf, offset);
    offset = o1;
    const field = Number(tag >> 3n);
    const wireType = Number(tag & 7n);
    if (wireType === 0) {
      const [val, o2] = readVarint(buf, offset);
      offset = o2;
      out.push({ field, wireType, value: val });
    } else if (wireType === 2) {
      const [len, o2] = readVarint(buf, offset);
      offset = o2;
      const l = Number(len);
      out.push({ field, wireType, value: buf.subarray(offset, offset + l) });
      offset += l;
    } else {
      throw new Error(`unsupported wire type ${wireType} for field ${field}`);
    }
  }
  return out;
}

function decodeTfsUrl(url: string): DecodedField[] {
  const tfs = new URL(url).searchParams.get('tfs');
  if (!tfs) throw new Error('no tfs param in URL');
  return decode(Buffer.from(tfs, 'base64url'));
}

function decodeLeg(buf: Buffer) {
  const fields = decode(buf);
  const dateField = fields.find((f) => f.field === 2);
  const originNode = fields.find((f) => f.field === 13);
  const destNode = fields.find((f) => f.field === 14);
  const segmentFields = fields.filter((f) => f.field === 4);
  return {
    date: (dateField!.value as Buffer).toString('utf8'),
    origin: decode(originNode!.value as Buffer).find((f) => f.field === 2)!.value.toString(),
    dest: decode(destNode!.value as Buffer).find((f) => f.field === 2)!.value.toString(),
    segmentCount: segmentFields.length,
  };
}

const seg = (origin: string, date: string, dest: string, airline: string, flightNum: string): FlightSegment => ({
  origin, date, dest, airline, flightNum,
});

describe('buildGoogleFlightsMultiCityTfsUrl', () => {
  it('sets trip type field 19 = 3 (multi-city), not 1 (round-trip) — verified against a real Google-issued multi-city tfs', () => {
    const url = buildGoogleFlightsMultiCityTfsUrl([
      { segments: [seg('EWR', '2026-07-16', 'LAS', 'UA', '100')], origin: 'EWR', dest: 'LAS' },
      { segments: [seg('LAS', '2026-07-20', 'ORD', 'UA', '200')], origin: 'LAS', dest: 'ORD' },
      { segments: [seg('ORD', '2026-07-24', 'EWR', 'UA', '300')], origin: 'ORD', dest: 'EWR' },
    ]);

    const fields = decodeTfsUrl(url);
    const tripType = fields.find((f) => f.field === 19);
    expect(tripType?.value).toBe(3n);
  });

  it('emits one repeated field-3 leg entry per leg, in order, with the right route and date', () => {
    const url = buildGoogleFlightsMultiCityTfsUrl([
      { segments: [seg('EWR', '2026-07-16', 'LAS', 'UA', '100')], origin: 'EWR', dest: 'LAS' },
      { segments: [seg('LAS', '2026-07-20', 'ORD', 'UA', '200')], origin: 'LAS', dest: 'ORD' },
      { segments: [seg('ORD', '2026-07-24', 'EWR', 'UA', '300')], origin: 'ORD', dest: 'EWR' },
    ]);

    const fields = decodeTfsUrl(url);
    const legs = fields.filter((f) => f.field === 3).map((f) => decodeLeg(f.value as Buffer));

    expect(legs).toHaveLength(3);
    expect(legs[0]).toMatchObject({ date: '2026-07-16', origin: 'EWR', dest: 'LAS', segmentCount: 1 });
    expect(legs[1]).toMatchObject({ date: '2026-07-20', origin: 'LAS', dest: 'ORD', segmentCount: 1 });
    expect(legs[2]).toMatchObject({ date: '2026-07-24', origin: 'ORD', dest: 'EWR', segmentCount: 1 });
  });

  it('round-trip builder still sets trip type field 19 = 1 (unchanged by the multi-city addition)', () => {
    const url = buildGoogleFlightsRoundTripTfsUrl(
      [seg('EWR', '2026-07-16', 'LAS', 'UA', '100')], 'EWR', 'LAS',
      [seg('LAS', '2026-07-23', 'EWR', 'UA', '200')], 'LAS', 'EWR',
    );
    const fields = decodeTfsUrl(url);
    expect(fields.find((f) => f.field === 19)?.value).toBe(1n);
  });
});
