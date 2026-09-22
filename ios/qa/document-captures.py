"""Turn a downloaded capture artifact into versioned, per-page Markdown evidence."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil

parser = argparse.ArgumentParser()
parser.add_argument('artifact', type=Path)
parser.add_argument('--destination', type=Path, default=Path('docs/runtime-20260923'))
parser.add_argument('--capture-date', default='2026-09-23（香港时间；UTC 为 2026-09-22）')
args = parser.parse_args()
manifest = json.loads((args.artifact / 'manifest.json').read_text(encoding='utf-8'))
dest = args.destination
(dest / 'images').mkdir(parents=True, exist_ok=True)
shutil.copy2(args.artifact / 'manifest.json', dest / 'manifest.json')
for name in ['xcode-version.txt', 'macos-version.txt']:
    if (args.artifact / name).exists(): shutil.copy2(args.artifact / name, dest / name)
groups = {}
for item in manifest['pages']:
    groups.setdefault(item['key'], []).append(item)
    if item['status'] == 'captured':
        source = args.artifact / item['file']
        if hashlib.sha256(source.read_bytes()).hexdigest() != item['sha256']:
            raise RuntimeError('Screenshot hash mismatch: ' + item['file'])
        shutil.copy2(source, dest / 'images' / item['file'])
run_url = 'https://github.com/wkun475-star/flighty-everything/actions/runs/' + str(manifest['runID'])
index = ['# 当前版本：iOS 模拟器逐页运行截图', '',
         f'采集日期：{args.capture_date}。截图由 GitHub Mac/Xcode 编译后的应用在 iPhone 模拟器中实际运行产生。不是网页截图、不是设计稿，也不是真机拍摄。', '',
         f'- 源码提交：`{manifest["sourceCommit"]}`。', f'- [GitHub 构建与采集记录]({run_url})。',
         '- [原始采集清单](manifest.json)、[Xcode 版本](xcode-version.txt)、[macOS 版本](macos-version.txt)。',
         '- 使用仅限模拟器且需显式开启的页面导航助手进入已有 React 页面，再由 `simctl` 截取真实画面。没有拼接或生成应用截图，没有伪造网络数据。',
         '- 每张截图前后均读取前台应用的新响应并检查目标页面；这能排除失去响应/退回桌面，不能代替人工视觉检查或触摸手势测试。',
         '- 使用全新模拟器和应用自带演示行程，不申请定位、不发送邀请、不发布社区内容；数据不能代表真实行程。', '',
         '## 页面目录', '', '| 页面 | 浅色 | 深色 |', '| --- | --- | --- |']
for key, items in groups.items():
    title = items[0]['title']
    states = {i['theme']: i['status'] for i in items}
    index.append(f'| [{title}]({key}.md) | {states.get("light", "未采集")} | {states.get("dark", "未采集")} |')
    lines = [f'# {title}', '', items[0]['description'], '',
             '请同时阅读 [可见问题与覆盖限制](VISUAL_NOTES.md)。截图生成成功不等于功能或布局验收通过。', '',
             f'源码：`{manifest["sourceCommit"]}`。[本次运行]({run_url})。', '']
    for item in items:
        theme = '浅色' if item['theme'] == 'light' else '深色'
        lines += [f'## {theme}', '']
        if item['status'] != 'captured':
            lines += ['**未完成截图，不用旧图替代。**', '', '采集原因：`' + item.get('error', '未知')[:500] + '`', '']
            continue
        evidence = item.get('after', {})
        headings = ' / '.join(evidence.get('headings', [])[:8]) or '此状态没有独立文字标题'
        lines += [f'<img src="images/{item["file"]}" width="402" alt="{title}，{theme}，本次模拟器实际截图" />', '',
                  f'- 文件：`{item["file"]}`。', f'- 内容说明：{item["description"]}',
                  f'- 页面实际标题：{headings}。', f'- 目标元素：`{item["selector"]}`。',
                  f'- 模拟器设置外观：`{item["theme"]}`；页面主题字段：`{evidence.get("theme") or "未提供，不能据此验证实际配色"}`；视口：`{evidence.get("viewport")}`。',
                  f'- 地图就绪字段：`{evidence.get("mapReady", "此页没有主地图字段")}`；该字段不保证地图瓦片无缺失。',
                  f'- 原图 SHA-256：`{item["sha256"]}`。', '',
                  '截图仅记录此时此刻的可见页面。外部数据、定位、输入键盘、滑动手势和业务提交并未因此被验证。可见异常应结合本册的人工检查备注理解。', '']
    (dest / (key + '.md')).write_text('\n'.join(lines), encoding='utf-8')
index += ['', '## 覆盖边界', '',
          '- 上表逐项列出实际采集结果；`captured` 只表示取得前台画面，不代表页面完全无缺陷。',
          '- 系统分享、文件选择、系统权限弹窗及第三方网页不在应用页面截图范围；没有执行会向外发送信息的操作。',
          '- 旧版不可达的 flight-detail、flight-stats、delay-stats、aircraft-stats 组件没有当前导航入口，未冒充可用页面截图。',
          '- 历史图仍在 [旧截图档案](../screenshots/README.md)，不得混作本次截图。', '',
          '## 人工查看备注', '',
          '参见 [视觉检查说明](VISUAL_NOTES.md)。', '']
(dest / 'README.md').write_text('\n'.join(index), encoding='utf-8')
print(json.dumps({'pages':len(groups),'screenshots':sum(i['status']=='captured' for i in manifest['pages']), 'destination':str(dest)}))
