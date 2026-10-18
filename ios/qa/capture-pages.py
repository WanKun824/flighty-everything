"""Capture actual Simulator pixels of current React pages, with bounded failures.

--list prints the shared page plan for the browser selector regression test.
No replacement UI, network fixtures, private data, or external writes are used.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time
import uuid

OUT = Path('build/page-captures').resolve()
BUNDLE = 'com.wankun824.flightyeverything'
APP = Path('build/simulator/Build/Products/Release-iphonesimulator/App.app').resolve()


def run(*args, **kwargs):
    return subprocess.check_output(list(args), text=True, timeout=kwargs.pop('timeout', 60), **kwargs).strip()


def navigate(tab='flights', overlay=None, height=.93, mode=None):
    detail = dict(tab=tab, overlay=overlay, height=height, mode=mode)
    return 'window.dispatchEvent(new CustomEvent("fly-screenshot-navigate",{detail:' + json.dumps(detail) + '})); "navigated"'


def click(selector, index=0):
    return f'(() => {{ const el=document.querySelectorAll({json.dumps(selector)})[{index}]; if(!el || !el.getClientRects().length)throw Error("Missing visible control"); el.click(); return "clicked"; }})()'


def fill(selector, value):
    return f'(() => {{ const el=document.querySelector({json.dumps(selector)}); if(!el)throw Error("Missing input"); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(el,{json.dumps(value)}); el.dispatchEvent(new Event("input",{{bubbles:true}})); el.dispatchEvent(new Event("change",{{bubbles:true}})); return "entered"; }})()'


PAGES = []


def page(key, title, selector, actions, description):
    PAGES.append(dict(key=key, title=title, selector=selector, actions=actions, description=description))


page('01-flights-compact', '行程：最小面板', '.primary-panel[data-tab="flights"]', [navigate(height=.3)], '地图背景、当前旅程摘要和四项底栏；使用应用自带演示行程。')
page('02-flights-expanded', '行程：展开列表', '.primary-panel[data-tab="flights"]', [navigate()], '大档路段列表，地图浮动控件与底栏应隐藏。')
page('03-detail-compact', '路段详情：最小档', '.mobile-journey-detail-target', [navigate(overlay='journey-detail', height=.3)], '最小详情摘要；不是拖动手势测试。')
page('04-detail-expanded', '路段详情：展开', '.journey-time-hero', [navigate(overlay='journey-detail')], '当前路段的大号出发/到达时间、进度与数据来源。')
page('04b-real-time-editor', '路段详情：真实时刻编辑', '.real-plan-editor', [navigate(overlay='journey-detail'), click('.journey-mode-control [role="group"] button', 1)], '真实时刻编辑，不保存计划或请求定位。')
page('05-trip-edit', '旅程：编辑名称', '.journey-names-sheet', [navigate(overlay='journey-names')], '旅程名称与删除入口，不提交修改或确认删除。')
page('06-detail-source', '路段详情：数据来源与删除入口', '.mobile-delete-journey', [navigate(overlay='journey-detail'), 'document.querySelector(".mobile-detail-body").scrollTop=100000; "scrolled"'], '滚动到详情下方的数据来源和删除按钮；不打开或确认系统删除操作表单。')
page('07-compose', '添加行程：模拟模式', '.composer-v2', [navigate(overlay='add-journey')], '所属旅程、载具、起终点与日期时间，未填写完成时保存禁用。')
page('08-compose-real', '添加行程：真实模式', '.composer-v2', [navigate(overlay='add-journey'), click('.composer-plan-mode button', 1)], '真实行程的到达时间与计划时区；不申请定位权限。')
page('09-origin-search', '添加行程：选择起点', '.composer-place-list', [navigate(overlay='add-journey'), click('.composer-endpoint', 0)], '真实地点选择器，显示收藏、最近地点或常用地点，不伪造查询结果。')
page('10-destination-search', '添加行程：选择终点', '.composer-place-list', [navigate(overlay='add-journey'), click('.composer-endpoint', 1)], '选择终点页面；不提交新行程。')
page('11-flight-search', '航班工具：推荐与入口', '[aria-label="航班工具"]', [navigate(overlay='add-flight', mode='suggested')], '常用航空公司、机场与航班查询入口。')
page('12-flight-number', '航班工具：按航班号查询', '[aria-label="航班工具"]', [navigate(overlay='add-flight', mode='number')], '航班号输入界面；不提交查询或伪造实时数据。')
page('13-flight-route', '航班工具：按航线查询', '[aria-label="航班工具"]', [navigate(overlay='add-flight', mode='route')], '出发机场、到达机场和日期选择。')
page('14-airports', '机场：目录与收藏', '.airports-sheet', [navigate(overlay='airports')], '机场目录、地区筛选与常驻搜索；目录不是实时运营状态。')
page('15-airport-search', '机场：搜索 HKG', '.airport-search-field', [navigate(overlay='airports'), fill('.airport-search-field input', 'HKG')], '通过当前搜索控件输入 HKG；不修改机场目录或收藏。')
page('16-airport-detail', '机场：香港机场资料', '.airport-detail-sheet', [navigate(overlay='airport-detail')], '实际 HKG 基础资料，不伪造登机口、航班或运营状态。')
page('17-weather', '地图：天气与地球图层', '.weather-sheet', [navigate(overlay='weather')], '天气显示和地图图层选项，实际网络状态如实保留。')
page('18-friends-intro', '同行：介绍', '.onboarding-sheet', [navigate(overlay='friends-intro')], '现有本地同行引导页，不代表云共享服务可用。')
page('19-profile-name', '同行：填写姓名', '.profile-name-input', [navigate(overlay='profile-name')], '姓名设置页面，不填写真实个人信息。')
page('20-profile-avatar', '同行：选择头像', '.avatar-builder', [navigate(overlay='profile-avatar')], '现有头像颜色选择，不保存资料。')
page('21-friends-ready', '同行：完成引导', '.onboarding-sheet', [navigate(overlay='friends-ready')], '现有引导完成页面，不发送邀请。')
page('22-friends-list', '同行：列表与空状态', '.primary-panel[data-tab="friends"]', [navigate(tab='friends', height=.57)], '使用当前空状态，不创建同行关系。')
page('23-add-friend', '同行：邀请码表单', '.add-friend-hero', [navigate(overlay='add-friend')], '本地演示的邀请码输入界面，不提交邀请码。')
page('24-profile', '个人资料：姓名与外观', '.profile-sheet', [navigate(overlay='profile')], '姓名、头像、外观与清除入口，不保存或清除数据。')
page('25-passport-compact', '旅迹：最小面板', '.primary-panel[data-tab="passport"]', [navigate(tab='passport', height=.3)], '最小旅迹摘要；演示行程不代表真实足迹。')
page('26-passport-expanded', '旅迹：概览', '.primary-panel[data-tab="passport"]', [navigate(tab='passport')], '分组统计与旅程列表，未完成行程的统计可为零。')
page('27-passport-stats', '旅迹：详细统计', '.passport-detail', [navigate(tab='passport', overlay='journey-passport-stats')], '统计页标题、时间筛选和足迹地图或空状态。')
page('28-community', '社区：主应用信息流', '.community-feed', [navigate(tab='community', height=.57)], '主应用社区入口；示例或同步状态按实际情况记录。')
page('29-community-publish', '社区：发布表单', 'dialog.publish-journey-dialog[open]', [navigate(tab='community', height=.57), click('.community-feed-heading [aria-label="发布行程"]')], '实际模态发布表单，不发布、点赞或上传内容。')
page('30-community-expanded', '社区：展开信息流', '.community-feed', [navigate(tab='community')], '大档社区列表，保留当前真实服务或离线状态。')
page('31-community-detail', '社区：行程详情', '.community-detail-card', [navigate(tab='community'), click('.community-card-actions button', 1)], '实际分享详情，不保存、点赞或发布行程。')

SNAPSHOT = '''JSON.stringify({
  title: document.title, url: location.href,
  theme: document.documentElement.dataset.theme,
  nativeTheme: document.documentElement.dataset.nativeSystemTheme,
  viewport:{width:innerWidth,height:innerHeight,scale:visualViewport?.scale},
  headings:[...document.querySelectorAll('h1,h2,h3')].filter(x=>x.getClientRects().length).map(x=>x.innerText).filter(Boolean),
  dialogs:[...document.querySelectorAll('[role="dialog"],dialog[open]')].filter(x=>x.getClientRects().length).map(x=>({label:x.getAttribute('aria-label'),className:x.className})),
  tab:document.querySelector('.primary-panel')?.dataset.tab,
  mapReady:document.querySelector('.flight-globe-map')?.dataset.mapReady,
  bodyText:document.body.innerText.slice(0,9000),
  nativeChrome:document.documentElement.dataset.nativeChrome
})'''


def capture(device, directory, theme):
    def command(script, timeout=12):
        identifier = str(uuid.uuid4())
        pending = directory / 'screenshot-command.tmp'
        pending.write_text(json.dumps(dict(id=identifier, script=script)), encoding='utf-8')
        pending.replace(directory / 'screenshot-command.json')
        end = time.monotonic() + timeout
        while time.monotonic() < end:
            try:
                result = json.loads((directory / 'screenshot-response.json').read_text())
                if result['id'] == identifier:
                    if result['error'] or not result['active']:
                        raise RuntimeError(str(result))
                    return result
            except (FileNotFoundError, json.JSONDecodeError):
                pass
            time.sleep(.25)
        raise RuntimeError('No fresh response from foreground app')

    report = dict(sourceCommit=run('git', 'rev-parse', 'HEAD'), runID=os.environ.get('GITHUB_RUN_ID'),
                  repository=os.environ.get('GITHUB_REPOSITORY', 'wkun475-star/flighty-everything'),
                  capturedAt=datetime.now(timezone.utc).isoformat(),
                  device=run('xcrun', 'simctl', 'list', 'devices', '-j'),
                  method='Native Simulator pixels; gated QA page selection and current controls, not touch tests',
                  pages=[], excluded=['OS permission/share/file pickers and native delete confirmation are not captured',
                                      'No location permission, deletion, invitation, publishing or likes are submitted'])
    consecutive_failures = 0
    startup_error = None
    try:
        run('xcrun', 'simctl', 'ui', device, 'appearance', theme)
        env = dict(os.environ, SIMCTL_CHILD_FLY_SCREENSHOT_SESSION='1')
        run('xcrun', 'simctl', 'launch', device, BUNDLE, env=env)
        deadline = time.monotonic() + 90
        while True:
            try:
                command('if(!document.querySelector(".primary-panel"))throw Error("Not ready"); "ready"', timeout=8)
                break
            except RuntimeError:
                if time.monotonic() >= deadline:
                    raise
                time.sleep(2)
        time.sleep(8)
    except Exception as error:
        startup_error = str(error)

    for spec in PAGES:
        record = {k: v for k, v in spec.items() if k != 'actions'}
        record.update(theme=theme, status='failed')
        name = spec['key'] + '-' + theme
        try:
            if startup_error:
                raise RuntimeError(startup_error)
            if consecutive_failures >= 3:
                raise RuntimeError('Capture stopped after three consecutive failures; no old image substituted')
            # Reset via existing navigation before each independent state. Close only
            # an open publish form, never a native destructive confirmation.
            command('document.querySelector(\'dialog[open] [aria-label="关闭发布行程"]\')?.click(); "closed-form"')
            command(navigate(height=.3))
            time.sleep(.8)
            for action in spec['actions']:
                command(action)
                time.sleep(.9)
            command('document.activeElement?.blur(); "blurred"')
            time.sleep(1.2)
            selector = json.dumps(spec['selector'])
            command(f'if(![...document.querySelectorAll({selector})].some(el=>el.getClientRects().length))throw Error("Visible target missing"); "target-ready"')
            before = command(SNAPSHOT)
            evidence = json.loads(before['result'])
            if evidence.get('theme') != theme:
                raise RuntimeError('Page theme mismatch: ' + str(evidence.get('theme')))
            image = OUT / (name + '.png')
            for attempt in range(2):
                try:
                    image.unlink(missing_ok=True)
                    before = command(SNAPSHOT)
                    evidence = json.loads(before['result'])
                    run('xcrun', 'simctl', 'io', device, 'screenshot', str(image), timeout=45)
                    break
                except subprocess.TimeoutExpired:
                    if attempt == 1:
                        raise
                    time.sleep(3)
            after = command(SNAPSHOT)
            if time.time() - after['time'] > 8:
                raise RuntimeError('Stale app response')
            record.update(status='captured', screenshotAttempt=attempt + 1, file=image.name, sha256=hashlib.sha256(image.read_bytes()).hexdigest(),
                          before=evidence, after=json.loads(after['result']))
            consecutive_failures = 0
        except Exception as error:
            record['error'] = str(error)
            consecutive_failures += 1
        report['pages'].append(record)
        (OUT / 'manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
        print(name, record['status'], flush=True)
    if any(p['status'] != 'captured' for p in report['pages']):
        raise RuntimeError('Some pages were not captured; inspect manifest.json')


def main(theme):
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'manifest.json').unlink(missing_ok=True)
    build = json.loads((APP / 'public/build-info.json').read_text())
    if build['sourceCommit'] != run('git', 'rev-parse', 'HEAD'):
        raise RuntimeError('Simulator build source does not match checkout')
    (OUT / 'build-info.json').write_text(json.dumps(build, indent=2), encoding='utf-8')
    runtimes = json.loads(run('xcrun', 'simctl', 'list', 'runtimes', '-j'))['runtimes']
    runtime = [r['identifier'] for r in runtimes if r.get('isAvailable') and 'iOS' in r['name']][-1]
    types = json.loads(run('xcrun', 'simctl', 'list', 'devicetypes', '-j'))['devicetypes']
    device_type = next(d['identifier'] for d in types if d['name'] == 'iPhone 17 Pro')
    device = run('xcrun', 'simctl', 'create', 'fly capture '+theme+' '+str(os.getpid()), device_type, runtime)
    try:
        run('xcrun', 'simctl', 'boot', device)
        run('xcrun', 'simctl', 'bootstatus', device, '-b', timeout=150)
        run('xcrun', 'simctl', 'install', device, str(APP))
        directory = Path(run('xcrun', 'simctl', 'get_app_container', device, BUNDLE, 'data')) / 'Documents'
        directory.mkdir(exist_ok=True)
        capture(device, directory, theme)
    finally:
        for operation in ['shutdown', 'delete']:
            try:
                subprocess.run(['xcrun', 'simctl', operation, device], capture_output=True, timeout=30)
            except subprocess.TimeoutExpired:
                print('Simulator cleanup timed out: ' + operation + '; preserving capture result', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--list', action='store_true')
    parser.add_argument('--theme', choices=['light', 'dark'], default='light')
    parser.add_argument('--keys', default='', help='Optional comma-separated failed page keys to retry')
    args = parser.parse_args()
    if args.list:
        print(json.dumps(PAGES, ensure_ascii=True))
    else:
        if args.keys:
            keys = set(args.keys.split(','))
            if not keys.issubset({page['key'] for page in PAGES}):
                parser.error('Unknown capture key')
            PAGES[:] = [page for page in PAGES if page['key'] in keys]
        try:
            main(args.theme)
        except Exception as error:
            OUT.mkdir(parents=True, exist_ok=True)
            if not (OUT / 'manifest.json').exists():
                report = dict(sourceCommit=run('git', 'rev-parse', 'HEAD'), runID=os.environ.get('GITHUB_RUN_ID'),
                              repository=os.environ.get('GITHUB_REPOSITORY'), capturedAt=datetime.now(timezone.utc).isoformat(),
                              method='Simulator startup/capture attempt failed; no image substituted', startupError=str(error),
                              pages=[{**{k: v for k, v in spec.items() if k != 'actions'},
                                      'theme': args.theme, 'status': 'failed', 'error': str(error)} for spec in PAGES])
                (OUT / 'manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
            raise
