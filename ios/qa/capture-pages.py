"""Compile separately, then capture real Simulator pixels of existing app pages.

Navigation uses a simulator-only React page selector plus existing DOM controls.
This is screenshot coverage, not a replacement for touch/gesture interaction tests.
"""
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
    return subprocess.check_output(list(args), text=True, **kwargs).strip()

def navigate(tab='flights', overlay=None, height=.93, mode=None):
    detail = dict(tab=tab, overlay=overlay, height=height, mode=mode)
    return 'window.dispatchEvent(new CustomEvent("fly-screenshot-navigate",{detail:' + json.dumps(detail) + '})); "navigated"'

def click(selector, index=0):
    return f'(() => {{ const el=document.querySelectorAll({json.dumps(selector)})[{index}]; if(!el)throw Error("Missing control"); el.click(); return "clicked"; }})()'

PAGES = []
def page(key, title, selector, actions, description):
    PAGES.append(dict(key=key, title=title, selector=selector, actions=actions, description=description))

page('01-flights-compact', '行程：最小面板', '.primary-panel[data-tab="flights"]', [navigate(height=.28)], '地图背景、旅程摘要、底部 Dock；使用应用自带演示行程。')
page('02-flights-expanded', '行程：展开列表', '.primary-panel[data-tab="flights"]', [navigate()], '展开当前旅程的路段列表；展示现有布局，不证明真实交通状态。')
page('03-detail-compact', '路段详情：最小档', '.mobile-journey-detail-target', [navigate(overlay='journey-detail', height=.2)], '最小详情摘要；不是拖动手势测试。')
page('04-detail-expanded', '路段详情：展开', '.mobile-journey-detail-target', [navigate(), navigate(overlay='journey-detail')], '选中路段的出发、到达、状态和数据来源。')
page('04b-real-time-editor', '路段详情：真实时刻编辑', '.real-plan-editor', [click('.journey-mode-control [role="group"] button', 1)], '编辑真实出发、到达和时区，不保存计划或请求定位。')
page('05-trip-edit', '旅程编辑', '.journey-names-sheet', [navigate(overlay='journey-names')], '旅程名称编辑及删除入口，不提交修改。')
page('06-trip-delete-confirm', '删除旅程确认', '.journey-delete-confirm', [navigate(), navigate(overlay='journey-names'), click('.journey-delete-trip')], '仅展开确认提示，不执行删除。')
page('07-compose', '添加行程：模拟模式', '.composer-v2', [navigate(overlay='add-journey')], '所属旅程、载具、起终点、日期时间及保存入口。')
page('08-compose-real', '添加行程：真实模式', '.composer-v2', [click('.composer-plan-mode button', 1)], '真实行程的到达时间与计划时区；不申请用户定位权限。')
page('09-origin-search', '搜索与选择起点', '.composer-place-list', [click('.composer-endpoint', 0)], '应用真实地点选择器，包含收藏和常用地点；网络加载情况如实保留。')
page('10-destination-search', '搜索与选择终点', '.composer-place-list', [navigate(), navigate(overlay='add-journey'), click('.composer-endpoint', 1)], '选择终点页面；不提交新行程。')
page('11-flight-search', '航班添加工具', '[aria-label="Add Flight"]', [navigate(overlay='add-flight', mode='suggested')], '常用航空公司、机场及其他航班查询方式。')
page('12-flight-number', '按航班号查询', '[aria-label="Add Flight"]', [navigate(overlay='add-flight', mode='number')], '航班号输入界面；不伪造查询成功或实时数据。')
page('13-flight-route', '按航线查询', '[aria-label="Add Flight"]', [navigate(overlay='add-flight', mode='route')], '出发、到达机场及日期选择。')
page('14-airports', '机场目录与收藏', '.airports-sheet', [navigate(overlay='airports')], '机场目录、地区筛选及收藏。目录不是实时运营状态。')
page('15-airport-search', '机场搜索', '.airport-search-field', [click('.airport-search-orb')], '展开所有机场搜索输入；原生键盘不包含在覆盖承诺中。')
page('16-airport-detail', '香港机场资料', '.airport-detail-sheet', [navigate(overlay='airport-detail')], '使用项目实际 HKG 机场资料组件，不伪造运营状态。')
page('17-weather', '天气与地球图层', '.weather-sheet', [navigate(overlay='weather')], '天气显示和地图图层选项，网络图层的加载状态原样记录。')
page('18-friends-intro', '同行：介绍', '.onboarding-sheet', [navigate(overlay='friends-intro')], '同行引导页。文案不代表云共享服务已验证。')
page('19-profile-name', '同行：填写姓名', '.profile-name-input', [navigate(overlay='profile-name')], '姓名设置页面，未填写真实个人信息。')
page('20-profile-avatar', '同行：选择头像', '.avatar-builder', [navigate(overlay='profile-avatar')], '头像颜色选择；保留默认示例资料。')
page('21-friends-ready', '同行：完成引导', '.onboarding-sheet', [navigate(overlay='friends-ready')], '引导完成页面的实际组件，不发送邀请。')
page('22-friends-list', '同行列表', '.primary-panel[data-tab="friends"]', [navigate(tab='friends')], '同行列表或当前空状态，不创建外部关系。')
page('23-add-friend', '添加同行者', '.add-friend-hero', [navigate(overlay='add-friend')], '同行邀请输入界面，不提交邀请码。')
page('24-profile', '个人资料与外观', '.profile-sheet', [navigate(overlay='profile')], '当前个人资料和浅色、深色、系统外观选项，不清空数据。')
page('25-passport-compact', '旅记：最小面板', '.primary-panel[data-tab="passport"]', [navigate(tab='passport', height=.3)], '最小旅记摘要与 ALL-TIME 护照信息。')
page('26-passport-expanded', '旅记：概览', '.primary-panel[data-tab="passport"]', [navigate(tab='passport')], '累计里程、载具和旅程列表；示例数据不是用户真实足迹。')
page('27-passport-stats', '旅记：详细统计', '.passport-detail', [navigate(tab='passport', overlay='journey-passport-stats')], '完整旅记统计页面顶部，数值取自应用当前演示状态。')
page('28-community', '旅行社区', '.journey-experience', [navigate(tab='friends'), click('.community-button')], '原生入口中的社区页；离线示例或服务状态按实际画面记录。')
page('29-community-publish', '社区：发布行程', '.publish-journey-dialog', [click('.journey-add-button')], '仅打开发布表单，不发布、点赞或发送任何内容。')
page('30-community-discover', '社区：发现', '.community-status', [click('.publish-journey-dialog header button'), click('.journey-glass-bar nav button', 1)], '原生社区列表及网络状态，不将示例内容称为实时分享。')
page('31-community-detail', '社区：行程详情', '.community-detail', [click('.community-card-actions button', 1)], '实际社区详情组件，不保存或更改其他人的行程。')

SNAPSHOT = '''JSON.stringify({
  title: document.title, url: location.href,
  theme: document.documentElement.dataset.nativeSystemTheme,
  viewport:{width:innerWidth,height:innerHeight,scale:visualViewport?.scale},
  headings:[...document.querySelectorAll('h1,h2,h3')].map(x=>x.innerText).filter(Boolean),
  dialogs:[...document.querySelectorAll('[role="dialog"]')].map(x=>({label:x.getAttribute('aria-label'),className:x.className})),
  tab:document.querySelector('.primary-panel')?.dataset.tab,
  mapReady:document.querySelector('.flight-globe-map')?.dataset.mapReady,
  bodyText:document.body.innerText.slice(0,9000),
  nativeChrome:document.documentElement.dataset.nativeChrome
})'''

def capture(device, directory):
    def command(script, timeout=25):
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
                  device=run('xcrun', 'simctl', 'list', 'devices', '-j'),
                  method='Native simulator screenshot; page selection via gated QA navigation and real controls, not touch tests',
                  pages=[], excluded=['Legacy flight-detail/flight-stats/delay-stats/aircraft-stats have no current navigation entry',
                                     'OS permission/share/file pickers require user interaction; no private data or external writes'])
    try:
        for theme in ['light', 'dark']:
            run('xcrun', 'simctl', 'ui', device, 'appearance', theme)
            subprocess.run(['xcrun', 'simctl', 'terminate', device, BUNDLE], capture_output=True)
            env = dict(os.environ, SIMCTL_CHILD_FLY_SCREENSHOT_SESSION='1')
            run('xcrun', 'simctl', 'launch', device, BUNDLE, env=env)
            time.sleep(8)
            # Wait for actual React controls; map readiness is separately recorded.
            for attempt in range(12):
                try:
                    command('if(!document.querySelector(".primary-panel"))throw Error("Not ready"); "ready"')
                    break
                except RuntimeError:
                    if attempt == 11: raise
                    time.sleep(2)
            time.sleep(8)
            for spec in PAGES:
                record = {k:v for k,v in spec.items() if k != 'actions'}
                record.update(theme=theme, status='failed')
                name = spec['key'] + '-' + theme
                try:
                    for action in spec['actions']:
                        command(action)
                        time.sleep(1.1)
                    command('document.activeElement?.blur(); "blurred"')
                    time.sleep(1.5)
                    selector = json.dumps(spec['selector'])
                    command(f'if(!document.querySelector({selector}))throw Error("Target page missing"); "target-ready"')
                    before = command(SNAPSHOT)
                    image = OUT / (name + '.png')
                    run('xcrun', 'simctl', 'io', device, 'screenshot', str(image))
                    after = command(SNAPSHOT)
                    if time.time() - after['time'] > 8:
                        raise RuntimeError('Stale app response')
                    record.update(status='captured', file=image.name, sha256=hashlib.sha256(image.read_bytes()).hexdigest(),
                                  before=json.loads(before['result']), after=json.loads(after['result']))
                except Exception as error:
                    record['error'] = str(error)
                report['pages'].append(record)
                (OUT / 'manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
                print(name, record['status'], flush=True)
    finally:
        (OUT / 'manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    if any(p['status'] != 'captured' for p in report['pages']):
        raise RuntimeError('Some pages were not captured; inspect manifest.json')

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    runtimes = json.loads(run('xcrun','simctl','list','runtimes','-j'))['runtimes']
    runtime = [r['identifier'] for r in runtimes if r.get('isAvailable') and 'iOS' in r['name']][-1]
    types = json.loads(run('xcrun','simctl','list','devicetypes','-j'))['devicetypes']
    device_type = next(d['identifier'] for d in types if d['name'] == 'iPhone 17 Pro')
    device = run('xcrun','simctl','create','fly page capture '+str(os.getpid()),device_type,runtime)
    try:
        run('xcrun','simctl','boot',device)
        run('xcrun','simctl','bootstatus',device,'-b')
        run('xcrun','simctl','install',device,str(APP))
        directory = Path(run('xcrun','simctl','get_app_container',device,BUNDLE,'data')) / 'Documents'
        directory.mkdir(exist_ok=True)
        capture(device, directory)
    finally:
        subprocess.run(['xcrun','simctl','shutdown',device],capture_output=True)
        subprocess.run(['xcrun','simctl','delete',device],capture_output=True)

if __name__ == '__main__':
    main()
