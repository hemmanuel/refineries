import urllib.request
import re

url = 'https://www.eia.gov/petroleum/refinerycapacity/'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    html = urllib.request.urlopen(req).read().decode('utf-8')
    links = re.findall(r'href=[\'"]([^\'"]+\.xls[x]?)[\'"]', html)
    for link in links:
        print(link)
    
    links2 = re.findall(r'href=[\'"]([^\'"]+\.csv)[\'"]', html)
    for link in links2:
        print(link)
except Exception as e:
    print(e)
