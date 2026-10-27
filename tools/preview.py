#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
一杯 · 校园奶茶点单 —— 预览服务器

两种用法：
    手机预览（同一局域网 / USB 网络共享）：
        双击 phone-preview.bat
    公网预览（手机用流量也能打开，只要这个窗口开着）：
        双击 公网预览.bat

也可以直接用命令：
    python tools/preview.py              开本地服务器（优先 80 和 8000），并打开电脑浏览器
    python tools/preview.py --public     再额外开一条公网隧道（ssh + localhost.run）
    python tools/preview.py --port 8000  只用一个指定端口
    python tools/preview.py --no-open    不自动打开电脑浏览器
"""

import argparse
import functools
import http.server
import os
import re
import shutil
import socket
import socketserver
import subprocess
import sys
import threading
import webbrowser

# 控制台编码兜底：万一有字符不在当前代码页里，也不让程序崩掉
try:
    sys.stdout.reconfigure(errors="replace")
except Exception:
    pass

# 项目根目录（本文件在 <项目>/tools/ 下）
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 依次尝试的端口：80 最省事（手机上不用输端口号），8000 是 README 里写的老端口
DEFAULT_PORTS = (80, 8000)
FALLBACK_PORTS = (8080, 8081, 3000)

LINE = "=" * 64

ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")
URL_RE = re.compile(r"https://[A-Za-z0-9.-]+\.lhr\.life")


def say(msg=""):
    """打印并立刻刷新，保证在 cmd 窗口里实时可见。"""
    print(msg, flush=True)


def primary_ipv4():
    """问系统：走哪块网卡能出外网？返回那块网卡的 IPv4。"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            # 连一个外网地址只是为了问路由，不会真的发包
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
        finally:
            sock.close()
    except OSError:
        return None


def local_addresses():
    """返回 (推荐 IPv4, 其它 IPv4 列表, 全局 IPv6 列表)。"""
    main = primary_ipv4()

    found = []
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if ip not in found:
                found.append(ip)
    except OSError:
        pass
    if main and main not in found:
        found.insert(0, main)

    v4_main, v4_other = [], []
    for ip in found:
        if ip.startswith("127.") or ip.startswith("169.254."):
            continue
        if ip == main:
            v4_main.append(ip)
        else:
            v4_other.append(ip)
    if not v4_main and v4_other:
        v4_main = [v4_other.pop(0)]

    v6 = []
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET6):
            ip = info[4][0].split("%")[0]
            if ip.startswith("fe80") or ip.startswith("fd") or ip == "::1":
                continue
            if ip not in v6:
                v6.append(ip)
    except OSError:
        pass

    return v4_main, v4_other, v6


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    """静悄悄的服务端：只把手机发来的请求打到窗口里，方便确认手机到底有没有连上。"""

    def log_message(self, *args):  # 关掉默认的一行一条日志
        pass

    def log_request(self, code="-", size="-"):
        ip = self.client_address[0]
        if ip.startswith("127.") or ip.startswith("::1"):
            return
        say("  [访问] %s  %s  ->  %s" % (ip, self.requestline, code))


class IPv4Server(http.server.ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True

    def server_bind(self):
        # 跳过反向解析，启动更快
        self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        socketserver.TCPServer.server_bind(self)


class IPv6Server(socketserver.ThreadingTCPServer):
    address_family = socket.AF_INET6
    allow_reuse_address = True
    daemon_threads = True

    def server_bind(self):
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 1)
        self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        socketserver.TCPServer.server_bind(self)


def url_of(ip, port):
    host = "[%s]" % ip if ":" in ip else ip
    if port == 80:
        return "http://%s/" % host
    return "http://%s:%d/" % (host, port)


def start_ipv4(port, handler):
    try:
        return IPv4Server(("0.0.0.0", port), handler)
    except OSError as exc:
        say("  [!] 端口 %d 用不了（%s）" % (port, exc))
        return None


def start_public_tunnel(port):
    """用 ssh 反向隧道把本地端口挂到公网，返回子进程（失败返回 None）。"""
    say("")
    say("  正在建立公网隧道（通常 3~10 秒）…")
    say("")

    if shutil.which("ssh") is None:
        say("  [X] 没找到 ssh 命令。Windows 10/11 一般自带 OpenSSH 客户端：")
        say("      设置 -> 应用 -> 可选功能 -> 添加功能 -> OpenSSH 客户端。")
        return None

    cmd = [
        "ssh",
        "-o", "StrictHostKeyChecking=no",
        "-o", "UserKnownHostsFile=NUL",
        "-o", "BatchMode=yes",
        "-o", "ServerAliveInterval=30",
        "-o", "ServerAliveCountMax=3",
        "-o", "ExitOnForwardFailure=yes",
        # 注意：这里必须写 127.0.0.1，不能写 localhost
        # （localhost 可能先解析到 IPv6 的 ::1，而服务器只监听 IPv4，会 502）
        "-R", "80:127.0.0.1:%d" % port,
        "nokey@localhost.run",
    ]

    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            bufsize=1,
        )
    except OSError as exc:
        say("  [X] 启动 ssh 失败：%s" % exc)
        return None

    state = {"url": None, "stopping": False, "tail": []}

    def reader():
        for raw in proc.stdout:
            line = ANSI_RE.sub("", raw).strip()
            if not line:
                continue
            found = URL_RE.search(line)
            if found and not state["url"]:
                state["url"] = found.group(0)
                say("  " + "=" * 60)
                say("   公网地址（这个窗口开着，手机用流量也能打开）：")
                say("")
                say("       %s" % state["url"])
                say("")
                say("   关掉这个窗口地址就失效；下次启动会换一个新地址。")
                say("  " + "=" * 60)
                say("")
            else:
                state["tail"] = (state["tail"] + [line])[-8:]
        if state["stopping"]:
            return
        if state["url"]:
            say("")
            say("  [!] 公网隧道已断开（网络波动或服务端断开）。")
            say("      本地预览还能用；重新双击「公网预览.bat」就能再来一条。")
        else:
            say("")
            say("  [!] 公网隧道没建起来，最近的 ssh 输出：")
            for line in state["tail"]:
                say("      " + line)

    threading.Thread(target=reader, daemon=True).start()
    return proc


def main(argv=None):
    parser = argparse.ArgumentParser(description="一杯 · 校园奶茶点单 预览服务器")
    parser.add_argument("--root", default=ROOT, help="要分享的文件夹（默认是项目根目录）")
    parser.add_argument("--port", type=int, default=None, help="只用这一个端口，默认自动挑")
    parser.add_argument("--no-open", action="store_true", help="不自动打开电脑上的浏览器")
    parser.add_argument("--public", action="store_true", help="额外开一条公网隧道（手机用流量也能打开）")
    args = parser.parse_args(argv)

    root = os.path.abspath(args.root)
    if not os.path.isfile(os.path.join(root, "index.html")):
        say("[X] 没找到 %s" % os.path.join(root, "index.html"))
        say("    请把 preview.py 放回项目的 tools 文件夹里再运行。")
        return 1

    say(LINE)
    say("  一杯 · 校园奶茶点单    本地预览")
    say(LINE)
    say("")

    handler = functools.partial(QuietHandler, directory=root)

    servers = []
    if args.port:
        server = start_ipv4(args.port, handler)
        if server is None:
            say("  [X] 指定的端口 %d 用不了，换个端口试试。" % args.port)
            return 1
        servers.append(server)
    else:
        for port in DEFAULT_PORTS:
            server = start_ipv4(port, handler)
            if server is not None:
                servers.append(server)
        if not servers:
            say("  默认端口都被占用了，再试几个备用端口…")
            for port in FALLBACK_PORTS:
                server = start_ipv4(port, handler)
                if server is not None:
                    servers.append(server)
                    break
    if not servers:
        say("  [X] 一个端口都开不了，请关掉占用端口的程序后再试。")
        return 1

    ports = [s.server_address[1] for s in servers]

    # 顺手把 IPv6 也开起来：有些校园网给手机的是 IPv6 地址，IPv4 不通时 IPv6 反而能通
    v6_server, v6_port = None, None
    for port in ports:
        try:
            v6_server = IPv6Server(("::", port), handler)
            v6_port = port
            threading.Thread(target=v6_server.serve_forever, daemon=True).start()
            break
        except OSError:
            v6_server = None
    for s in servers[1:]:
        threading.Thread(target=s.serve_forever, daemon=True).start()

    v4_main, v4_other, v6 = local_addresses()

    if args.public:
        tunnel = start_public_tunnel(ports[0])
    else:
        tunnel = None

    if tunnel is None:
        urls = []
        for ip in v4_main:
            for index, port in enumerate(ports):
                urls.append((url_of(ip, port), "推荐" if index == 0 else ""))
        for ip in v4_other:
            urls.append((url_of(ip, ports[0]), "备用"))
        if v6_server is not None:
            for ip in v6:
                urls.append((url_of(ip, v6_port), "IPv6"))

        say("  手机浏览器里打开下面任意一个地址（第一个连不上就换下一个）：")
        say("")
        for url, tag in urls:
            if tag:
                say("      %-46s  <- %s" % (url, tag))
            else:
                say("      %s" % url)

        say("")
        say("  ----------------------------------------------------------------")
        say("  前提：手机和电脑在【同一个网络】里，而且这个网络没有把两台设备隔离。")
        say("        想用公网地址（手机用流量也能开），请双击 公网预览.bat。")
        say("")
        say("  如果手机上显示「连接超时 / 无法访问此网站」：")
        say("    1. 确认手机连的确实是和电脑同一个网络；")
        say("    2. 校园网一般会把有线电脑和手机隔开，那就改用 USB 数据线：")
        say("       手机插到电脑上 -> 手机设置里打开「USB 网络共享」")
        say("       -> 电脑会多出一个网卡 -> 重新双击 phone-preview.bat")
        say("       -> 用窗口里新出现的那几个地址在手机上访问；")
        say("    3. 第一次启动如果 Windows 弹窗问是否允许网络访问，请点「允许」。")
        say("")
        say("  按 Ctrl+C 停止服务。")
        say("  ----------------------------------------------------------------")
        say("")

    local_url = url_of("127.0.0.1", ports[0])
    say("  这台电脑上访问：%s" % local_url)

    if not args.no_open:
        threading.Timer(0.6, lambda: webbrowser.open(local_url)).start()

    try:
        servers[0].serve_forever()
    except KeyboardInterrupt:
        say("")
        say("  已停止。")
    finally:
        if tunnel is not None:
            try:
                tunnel.terminate()
            except OSError:
                pass
        for s in servers[1:]:
            s.shutdown()
            s.server_close()
        servers[0].server_close()
        if v6_server is not None:
            v6_server.shutdown()
            v6_server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())