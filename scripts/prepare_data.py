"""One-off: imports the MVP package data into src/data with decisions from 9 Nov 2026 applied.
Usage: python3 scripts/prepare_data.py /path/to/Elonia_MVP_v1/data"""
import json, sys, re, pathlib
src = pathlib.Path(sys.argv[1]); out = pathlib.Path(__file__).resolve().parents[1] / 'src' / 'data'
L = lambda n: json.loads((src / n).read_text())
def S(n, v): (out / n).write_text(json.dumps(v, ensure_ascii=False, indent=1) + '\n')

for n in ['attributes', 'skills', 'rules', 'decisions', 'content_notes']:
    S(n + '.json', L(n + '.json'))

races = L('races.json')
for r in races:
    r['tagline'] = ''; r['description'] = ''
    if r['id'] == 'tii':
        r['tagline'] = 'Ловкость, находчивость и связь с природой.'
        r['description'] = 'Небольшие и подвижные существа, приспособленные к жизни среди растительности.'
S('races.json', races)

subs = L('subraces.json')
for s in subs:
    for t in s['traits']:
        m = re.match(r'^([^:.;]{3,40}):\s*(.*)$', t['text'])
        if m:
            t['name'], t['text'] = m.group(1).strip(), m.group(2)[0].upper() + m.group(2)[1:]
        elif t['text'].startswith('Отдельные'):
            t['placeholder'] = True
        else:
            t['name'] = t['text'].split('.')[0].split(';')[0][:40]
    # conditional bonus is shown next to SP, never added
    s['conditionalNotes'] = []
    if s['id'] == 'tii_lowland':
        s['conditionalNotes'] = ['+3 к физической СП против шшенийцев']
S('subraces.json', subs)

weapons = L('weapons.json')
for w in weapons:
    if w['id'] == 'souler':
        w['damageAttribute'] = None  # decision 9 Nov: Дух уже входит во владение «Духовное»
S('weapons.json', weapons)

fc = L('future_categories.json')
for c in fc:
    if c['id'] == 'souler':
        c['id'] = 'souler_technique'  # id отличается от оружия Соулер
S('future_categories.json', fc)

orders = L('orders.json')
for o in orders:
    o['description'] = ''
    if o['id'] == 'shadow':
        o['description'] = 'Доступ к Соулеру и связанным с ним техникам определяется условиями ордена. На этом этапе их согласует мастер.'
S('orders.json', orders)

art = lambda i, t: {'id': i, 'title': t, 'body': ''}
S('articles.json', {
    'contentVersion': '2026-11-09-mvp-1',
    'lore': [art('lore_history', 'История и эпохи'), art('lore_peoples', 'Народы Элонии'),
             art('lore_orders', 'Ордена'), art('lore_regions', 'Регионы')],
    'rulebook': [art('rules_creation', 'Создание персонажа'), art('rules_attributes', 'Характеристики и навыки'),
                 art('rules_resources', 'Здоровье и мораль'), art('rules_defense', 'Защита и попадание'),
                 art('rules_weapons', 'Оружие и урон'), art('rules_growth', 'Развитие персонажа')],
})
