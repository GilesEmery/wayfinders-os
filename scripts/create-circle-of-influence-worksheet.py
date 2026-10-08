"""Create the printable 15-person-per-area Circle of Influence worksheet."""
from pathlib import Path
import pymupdf

BLUE = (0, .33, .63)
INK = (.145, .165, .16)
GRAY = (.72, .76, .74)
OUTPUT = Path('public/downloads/circle-of-influence-worksheet.pdf')
doc = pymupdf.open()

def page(title):
    p = doc.new_page(width=612, height=792)
    p.draw_line((54, 54), (558, 54), color=BLUE, width=3)
    p.insert_text((54, 81), 'WAYFINDERS  /  CIRCLE OF INFLUENCE', fontsize=9, color=BLUE)
    p.insert_text((54, 122), title, fontsize=26, fontname='Times-Roman', color=INK)
    p.insert_text((54, 750), f'Circle of Influence  |  {len(doc)}', fontsize=9, color=INK)
    return p

p = page('Who is your flock?')
intro = '''Truly, truly, I say to you, he who does not enter by the door into the fold of the sheep, but climbs up some other way, he is a thief and a robber. (John 10:1, NASB)

A sheep pen: An open-air corral that protects the sheep at night from predators and thieves.

Folding the sheep: Managing sheep with a high level of skill and a special relationship between the shepherd and the sheep.

God has given everyone a unique circle of influence (oikos). As a believer, your circle of influence is your sheepfold. You are called to shepherd this fold and learn to do so effectively.

Influence is not developed overnight. Knowing who is in your community helps you discern whom and how to influence, understand, and listen to others. It also helps you recognize who is not in your fold yet.

A shepherding leader knows their sheep and recognizes when they need to be led forward, cared for, or protected.

List the people you rub shoulders with regularly in each applicable area. Aim for 4-15 people per area. Leave areas that do not apply blank. Name your Other community if you use it. Someone may appear in more than one area.

Pray for the people on your list. Ask God to reveal whom you ought to disciple.

As a disciple of Jesus, you are a leader. What will you do about it?'''
assert p.insert_textbox(pymupdf.Rect(54, 155, 558, 710), intro, fontsize=11, fontname='helv', color=INK, lineheight=1.45) >= 0
areas = ['Family', 'Friends', 'Work', 'Church Body', 'Hobbies / Activities', 'Neighbors', 'School', 'Other: ______________________________']
for start in range(0, 8, 2):
    p = page('Your people')
    for index, title in enumerate(areas[start:start+2]):
        y = 158 + index * 282
        p.insert_text((54, y), title, fontsize=18, fontname='Times-Roman', color=BLUE)
        for n in range(15):
            row = y + 23 + n * 15
            p.insert_text((54, row), f'{n+1:02}.', fontsize=9, color=BLUE)
            p.draw_line((80, row+2), (558, row+2), color=GRAY, width=.5)
p = page('Pray, discern, and act')
for i, title in enumerate(['How will you pray for the people on your list?', 'Who might God be inviting you to disciple?', 'What is your next step to listen, care, protect, or lead?']):
    y=162+i*180
    p.insert_textbox(pymupdf.Rect(54,y,558,y+38), title, fontsize=14, color=BLUE)
    for row in range(5):
        line=y+52+row*23
        p.draw_line((54,line),(558,line),color=GRAY,width=.5)
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
doc.set_metadata({'title': 'Circle of Influence - Wayfinders Worksheet', 'author': 'Wayfinders'})
doc.save(OUTPUT)
assert len(doc) == 6
for index in [0,1,4,5]:
    doc[index].get_pixmap(matrix=pymupdf.Matrix(1,1)).save(f'/tmp/circle-worksheet-{index+1}.png')
print(f'Created {OUTPUT} ({len(doc)} pages)')
