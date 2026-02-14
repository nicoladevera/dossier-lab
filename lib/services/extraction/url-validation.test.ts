// Mock jsdom, readability, and dns to avoid ESM/network issues — only testing validation logic
jest.mock("jsdom", () => ({}));
jest.mock("@mozilla/readability", () => ({}));
jest.mock("dns/promises", () => ({}));

import { isBlockedUrl, isPrivateIPv4, isPrivateIPv6 } from "./url-extractor";

describe("isPrivateIPv4", () => {
  it("should detect loopback range", () => {
    expect(isPrivateIPv4("127.0.0.1")).not.toBeNull();
    expect(isPrivateIPv4("127.0.0.2")).not.toBeNull();
    expect(isPrivateIPv4("127.255.255.255")).not.toBeNull();
  });

  it("should detect private ranges", () => {
    expect(isPrivateIPv4("10.0.0.1")).not.toBeNull();
    expect(isPrivateIPv4("172.16.0.1")).not.toBeNull();
    expect(isPrivateIPv4("172.31.255.255")).not.toBeNull();
    expect(isPrivateIPv4("192.168.1.1")).not.toBeNull();
  });

  it("should detect link-local / metadata", () => {
    expect(isPrivateIPv4("169.254.169.254")).not.toBeNull();
  });

  it("should allow public IPs", () => {
    expect(isPrivateIPv4("8.8.8.8")).toBeNull();
    expect(isPrivateIPv4("1.1.1.1")).toBeNull();
    expect(isPrivateIPv4("172.32.0.1")).toBeNull();
  });

  it("should return null for non-IP strings", () => {
    expect(isPrivateIPv4("example.com")).toBeNull();
    expect(isPrivateIPv4("not-an-ip")).toBeNull();
  });
});

describe("isPrivateIPv6", () => {
  it("should block link-local range (fe80::/10 = fe80::-febf::)", () => {
    expect(isPrivateIPv6("fe80::1")).not.toBeNull();
    expect(isPrivateIPv6("fe90::1")).not.toBeNull();
    expect(isPrivateIPv6("fea0::1")).not.toBeNull();
    expect(isPrivateIPv6("febf::1")).not.toBeNull();
  });

  it("should block unique-local range (fc00::/7 = fc00::-fdff::)", () => {
    expect(isPrivateIPv6("fc00::1")).not.toBeNull();
    expect(isPrivateIPv6("fc12::1")).not.toBeNull();
    expect(isPrivateIPv6("fcff::1")).not.toBeNull();
    expect(isPrivateIPv6("fd12::1")).not.toBeNull();
    expect(isPrivateIPv6("fdff::1")).not.toBeNull();
  });

  it("should block loopback", () => {
    expect(isPrivateIPv6("::1")).not.toBeNull();
  });

  it("should not block addresses just outside private ranges", () => {
    // fec0:: is just past link-local fe80::/10 range
    expect(isPrivateIPv6("fec0::1")).toBeNull();
    // fb:: is just before ULA fc00::/7 range
    expect(isPrivateIPv6("fb00::1")).toBeNull();
  });

  it("should block IPv4-mapped IPv6 with private IPs (dotted-quad form)", () => {
    expect(isPrivateIPv6("::ffff:127.0.0.1")).not.toBeNull();
    expect(isPrivateIPv6("::ffff:10.0.0.1")).not.toBeNull();
    expect(isPrivateIPv6("::ffff:192.168.1.1")).not.toBeNull();
    expect(isPrivateIPv6("::ffff:169.254.169.254")).not.toBeNull();
  });

  it("should block IPv4-mapped IPv6 with private IPs (hex-normalized form)", () => {
    // ::ffff:127.0.0.1 -> ::ffff:7f00:1
    expect(isPrivateIPv6("::ffff:7f00:1")).not.toBeNull();
    // ::ffff:10.0.0.1 -> ::ffff:a00:1
    expect(isPrivateIPv6("::ffff:a00:1")).not.toBeNull();
    // ::ffff:169.254.169.254 -> ::ffff:a9fe:a9fe
    expect(isPrivateIPv6("::ffff:a9fe:a9fe")).not.toBeNull();
    // ::ffff:192.168.1.1 -> ::ffff:c0a8:101
    expect(isPrivateIPv6("::ffff:c0a8:101")).not.toBeNull();
  });

  it("should allow IPv4-mapped IPv6 with public IPs (dotted-quad form)", () => {
    expect(isPrivateIPv6("::ffff:8.8.8.8")).toBeNull();
    expect(isPrivateIPv6("::ffff:1.1.1.1")).toBeNull();
  });

  it("should allow IPv4-mapped IPv6 with public IPs (hex-normalized form)", () => {
    // ::ffff:8.8.8.8 -> ::ffff:808:808
    expect(isPrivateIPv6("::ffff:808:808")).toBeNull();
    // ::ffff:1.1.1.1 -> ::ffff:101:101
    expect(isPrivateIPv6("::ffff:101:101")).toBeNull();
  });

  it("should allow public IPv6 addresses", () => {
    expect(isPrivateIPv6("2001:db8::1")).toBeNull();
    expect(isPrivateIPv6("2607:f8b0:4004:800::200e")).toBeNull();
  });
});

describe("isBlockedUrl", () => {
  it("should block non-HTTP protocols", () => {
    expect(isBlockedUrl("file:///etc/passwd")).not.toBeNull();
    expect(isBlockedUrl("ftp://example.com")).not.toBeNull();
    expect(isBlockedUrl("data:text/html,<h1>hi</h1>")).not.toBeNull();
  });

  it("should block localhost variants", () => {
    expect(isBlockedUrl("http://localhost/admin")).not.toBeNull();
    expect(isBlockedUrl("http://127.0.0.1/admin")).not.toBeNull();
    expect(isBlockedUrl("http://0.0.0.0/")).not.toBeNull();
    expect(isBlockedUrl("http://[::1]/")).not.toBeNull();
  });

  it("should block the full 127.0.0.0/8 loopback range", () => {
    expect(isBlockedUrl("http://127.0.0.2/")).not.toBeNull();
    expect(isBlockedUrl("http://127.255.255.255/")).not.toBeNull();
  });

  it("should block private IP ranges", () => {
    expect(isBlockedUrl("http://10.0.0.1/")).not.toBeNull();
    expect(isBlockedUrl("http://172.16.0.1/")).not.toBeNull();
    expect(isBlockedUrl("http://172.31.255.255/")).not.toBeNull();
    expect(isBlockedUrl("http://192.168.1.1/")).not.toBeNull();
  });

  it("should block cloud metadata endpoint", () => {
    expect(isBlockedUrl("http://169.254.169.254/latest/meta-data/")).not.toBeNull();
  });

  it("should block IPv6 private/link-local ranges", () => {
    expect(isBlockedUrl("http://[fe80::1]/")).not.toBeNull();
    expect(isBlockedUrl("http://[fc00::1]/")).not.toBeNull();
    expect(isBlockedUrl("http://[fd12::1]/")).not.toBeNull();
  });

  it("should block IPv4-mapped IPv6 targeting private IPs", () => {
    // URL parser normalizes these to hex form, so this tests the hex path
    expect(isBlockedUrl("http://[::ffff:127.0.0.1]/")).not.toBeNull();
    expect(isBlockedUrl("http://[::ffff:10.0.0.1]/")).not.toBeNull();
    expect(isBlockedUrl("http://[::ffff:169.254.169.254]/")).not.toBeNull();
    expect(isBlockedUrl("http://[::ffff:192.168.1.1]/")).not.toBeNull();
  });

  it("should allow IPv4-mapped IPv6 targeting public IPs", () => {
    expect(isBlockedUrl("http://[::ffff:8.8.8.8]/")).toBeNull();
    expect(isBlockedUrl("http://[::ffff:1.1.1.1]/")).toBeNull();
  });

  it("should NOT block legitimate domains starting with fd", () => {
    expect(isBlockedUrl("https://fda.gov/")).toBeNull();
    expect(isBlockedUrl("https://fdm.com/")).toBeNull();
    expect(isBlockedUrl("https://fdroid.org/")).toBeNull();
  });

  it("should allow valid public URLs", () => {
    expect(isBlockedUrl("https://example.com/article")).toBeNull();
    expect(isBlockedUrl("https://nytimes.com/news")).toBeNull();
    expect(isBlockedUrl("http://8.8.8.8/")).toBeNull();
  });

  it("should block 172.16-31 but allow outside that range", () => {
    expect(isBlockedUrl("http://172.15.0.1/")).toBeNull();
    expect(isBlockedUrl("http://172.32.0.1/")).toBeNull();
    expect(isBlockedUrl("http://172.16.0.1/")).not.toBeNull();
  });

  it("should return error for invalid URLs", () => {
    expect(isBlockedUrl("not-a-url")).not.toBeNull();
  });
});
