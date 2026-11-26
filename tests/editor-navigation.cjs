async function tab(page,key){if(!await page.locator('#gmWorkspace').evaluate(el=>el.open))await page.locator('#openGmWorkspace').click();await page.locator('#workspace-tab-'+key).click();}
async function files(page){if(!await page.locator('#gmWorkspace').evaluate(el=>el.open))await page.locator('#openGmWorkspace').click();if(!await page.locator('#workspaceFiles').evaluate(el=>el.open))await page.locator('#workspaceFiles>summary').click();}
async function home(page){if(await page.locator('#gmWorkspace').evaluate(el=>el.open)){await page.locator('#workspaceClose').click();await page.waitForFunction(()=>!document.getElementById('gmWorkspace').open)}}
module.exports={tab,files,home};
